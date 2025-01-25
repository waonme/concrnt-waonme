import { createContext, useCallback, useContext, useMemo } from 'react'
import { usePreference } from './PreferenceContext'
import { useClient } from './ClientContext'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { fileToBase64 } from '../util'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface StorageState {
    uploadFile: (file: File, onProgress?: (_: number) => void) => Promise<string>
    isUploadReady: boolean
}

const StorageContext = createContext<StorageState | undefined>(undefined)

export const StorageProvider = ({ children }: { children: JSX.Element | JSX.Element[] }): JSX.Element => {
    const { client } = useClient()
    const [storageProvider] = usePreference('storageProvider')
    const [s3Config] = usePreference('s3Config')
    const [imgurClientID] = usePreference('imgurClientID')

    const s3Client = useMemo(() => {
        if (storageProvider !== 's3') return null
        return new S3Client({
            endpoint: s3Config.endpoint,
            credentials: {
                accessKeyId: s3Config.accessKeyId,
                secretAccessKey: s3Config.secretAccessKey
            },
            region: 'auto',
            forcePathStyle: s3Config.forcePathStyle
        })
    }, [storageProvider, s3Config])

    const uploadFile = useCallback(
        async (file: File, onProgress?: (_: number) => void): Promise<string> => {
            if (storageProvider === 's3') {
                if (!s3Client) throw new Error('S3 client is not initialized')
                const base64Data = await fileToBase64(file)
                if (!base64Data) throw new Error('Failed to convert file to base64')
                const _base64Data = base64Data.split(',')[1]
                const byteCharacters = window.atob(_base64Data)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)

                const fileName = `${Date.now()}`
                const url = await getSignedUrl(
                    s3Client,
                    new PutObjectCommand({
                        Bucket: s3Config.bucketName,
                        Key: fileName
                    }),
                    {
                        expiresIn: 60 // 1 minute
                    }
                )

                const xhr = new XMLHttpRequest()
                xhr.open('PUT', url, true)
                xhr.setRequestHeader('Content-Type', file.type)
                xhr.setRequestHeader('Content-Encoding', 'base64')
                xhr.setRequestHeader('Content-Disposition', 'inline')

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress?.(e.loaded / e.total)
                    }
                }

                xhr.send(byteArray)

                return await new Promise<string>((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            resolve(`${s3Config.publicUrl}/${fileName}`)
                        } else {
                            reject(xhr.responseText)
                        }
                    }
                })
            } else if (storageProvider === 'imgur') {
                const url = 'https://api.imgur.com/3/image'
                if (!imgurClientID) return ''
                const isImage = file.type.includes('image')
                if (!isImage) throw new Error('Only images are supported for imgur uploads')

                const base64Data = await fileToBase64(file)
                if (!base64Data) throw new Error('Failed to convert file to base64')

                const xhr = new XMLHttpRequest()
                xhr.open('POST', url, true)
                xhr.setRequestHeader('Authorization', `Client-ID ${imgurClientID}`)
                xhr.setRequestHeader('Content-Type', 'application/json')

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress?.(e.loaded / e.total)
                    }
                }

                xhr.send(
                    JSON.stringify({
                        type: 'base64',
                        image: base64Data.replace(/^data:image\/[a-zA-Z]*;base64,/, '')
                    })
                )

                return await new Promise<string>((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            const json = JSON.parse(xhr.responseText)
                            resolve(json.data.link)
                        } else {
                            reject(xhr.responseText)
                        }
                    }
                })
            } else {
                const xhr = new XMLHttpRequest()
                xhr.open('POST', `https://${client.host}/storage/files`, true)
                xhr.setRequestHeader('Content-Type', file.type)
                xhr.setRequestHeader('Authorization', `Bearer ${client.api.generateApiToken(client.host)}`)

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress?.(e.loaded / e.total)
                    }
                }

                xhr.send(file)

                return await new Promise<string>((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            const json = JSON.parse(xhr.responseText)
                            resolve(json.content.url)
                        } else {
                            reject(xhr.responseText)
                        }
                    }
                })
            }
        },
        [storageProvider, imgurClientID, s3Config]
    )

    const isUploadReady = useMemo(() => {
        if (storageProvider === 's3') {
            return !!s3Config.endpoint
        } else if (storageProvider === 'imgur') {
            return !!imgurClientID
        } else {
            return 'mediaserver' in client.domainServices || 'world.concrnt.mediaserver' in client.domainServices
        }
    }, [storageProvider, imgurClientID, s3Client, client.domainServices])

    return (
        <StorageContext.Provider
            value={useMemo(
                () => ({
                    uploadFile,
                    isUploadReady
                }),
                [uploadFile, isUploadReady]
            )}
        >
            {children}
        </StorageContext.Provider>
    )
}

export function useStorage(): StorageState {
    const context = useContext(StorageContext)
    if (context === undefined) {
        throw new Error('useStorage must be used within a StorageProvider')
    }
    return context
}
