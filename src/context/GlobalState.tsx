import {
    type Timeline,
    type CoreEntity,
    type CommunityTimelineSchema,
    type CoreSubscription,
    type CoreProfile
} from '@concurrent-world/client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useClient } from './ClientContext'
import { usePreference } from './PreferenceContext'
import { useMediaQuery, useTheme } from '@mui/material'

export interface GlobalState {
    isCanonicalUser: boolean
    isRegistered: boolean
    isDomainOffline: boolean
    isMasterSession: boolean
    isMobileSize: boolean

    allKnownTimelines: Array<Timeline<CommunityTimelineSchema>>
    allKnownSubscriptions: Array<CoreSubscription<any>>
    listedSubscriptions: Record<string, CoreSubscription<any>>
    allProfiles: Array<CoreProfile<any>>
    reloadList: () => void
    getImageURL: (url?: string, params?: { maxWidth?: number; maxHeight?: number; format?: string }) => string
    setSwitchToSub: (state: boolean) => void
    switchToSubOpen: boolean
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined)

interface GlobalStateProps {
    children: JSX.Element | JSX.Element[]
}

export const GlobalStateProvider = ({ children }: GlobalStateProps): JSX.Element => {
    const { client } = useClient()
    const [lists] = usePreference('lists')

    const [isDomainOffline, setDomainIsOffline] = useState<boolean>(false)
    const [entity, setEntity] = useState<CoreEntity | null>(null)
    const isCanonicalUser = entity ? entity.domain === client?.host : true
    const [isRegistered, setIsRegistered] = useState<boolean>(true)
    const identity = JSON.parse(localStorage.getItem('Identity') || 'null')
    const isMasterSession = identity !== null
    const theme = useTheme()
    const isMobileSize = useMediaQuery(theme.breakpoints.down('sm'))

    const [allProfiles, setAllProfiles] = useState<Array<CoreProfile<any>>>([])
    const [allKnownTimelines, setAllKnownTimelines] = useState<Array<Timeline<CommunityTimelineSchema>>>([])
    const [allKnownSubscriptions, setAllKnownSubscriptions] = useState<Array<CoreSubscription<any>>>([])
    const [listedSubscriptions, setListedSubscriptions] = useState<Record<string, CoreSubscription<any>>>({})

    const [switchToSubOpen, setKeyModalOpen] = useState<boolean>(false)

    const getImageURL = useCallback(
        (url?: string, opts?: { maxWidth?: number; maxHeight?: number; format?: string }) => {
            if (!url) return ''
            if (url.startsWith('data:')) return url
            if ('world.concrnt.hyperproxy.image' in client.domainServices) {
                return `https://${client.host}${client.domainServices['world.concrnt.hyperproxy.image'].path}/${
                    opts?.maxWidth ?? ''
                }x${opts?.maxHeight ?? ''}${opts?.format ? ',' + opts.format : ''}/${url}`
            } else {
                return url
            }
        },
        [client]
    )

    useEffect(() => {
        client.api.getOwnSubscriptions<any>().then((subs) => {
            setAllKnownSubscriptions(subs)
        })
        client.api.getProfiles({ author: client.ccid }).then((characters) => {
            const profiles = (characters ?? []).filter((c) => c.schema !== 'https://schema.concrnt.world/p/main.json')
            setAllProfiles(profiles)
        })
    }, [])

    useEffect(() => {
        let unmounted = false
        setAllKnownTimelines([])
        Promise.all(
            Object.keys(lists).map((id) =>
                client.api
                    .getSubscription(id)
                    .then((sub) => {
                        return [id, sub]
                    })
                    .catch((e) => {
                        return [id, null]
                    })
            )
        ).then((subs) => {
            if (unmounted) return
            const validsubsarr = subs.filter((e) => e[1]) as Array<[string, CoreSubscription<any>]>
            const listedSubs = Object.fromEntries(validsubsarr)
            setListedSubscriptions(listedSubs)

            const validsubs = validsubsarr.map((e) => e[1])

            const allTimelines = validsubs.flatMap((sub) => sub.items.map((e) => e.id))
            const uniq = [...new Set(allTimelines)]
            uniq.forEach((id) => {
                client.getTimeline<CommunityTimelineSchema>(id).then((stream) => {
                    if (stream && !unmounted) {
                        setAllKnownTimelines((prev) => [...prev, stream])
                    }
                })
            })
        })

        return () => {
            unmounted = true
        }
    }, [lists])

    const reloadList = useCallback(() => {
        setAllKnownTimelines([])
        Promise.all(
            Object.keys(lists).map((id) =>
                client.api
                    .getSubscription(id)
                    .then((sub) => {
                        return [id, sub]
                    })
                    .catch((e) => {
                        return [id, null]
                    })
            )
        ).then((subs) => {
            const validsubsarr = subs.filter((e) => e[1]) as Array<[string, CoreSubscription<any>]>
            const listedSubs = Object.fromEntries(validsubsarr)
            setListedSubscriptions(listedSubs)

            const validsubs = validsubsarr.map((e) => e[1])

            const allTimelins = validsubs.flatMap((sub) => sub.items.map((e) => e.id))
            const uniq = [...new Set(allTimelins)]
            uniq.forEach((id) => {
                client.getTimeline<CommunityTimelineSchema>(id).then((stream) => {
                    if (stream) {
                        setAllKnownTimelines((prev) => [...prev, stream])
                    }
                })
            })
        })
        client.api.getOwnSubscriptions<any>().then((subs) => {
            setAllKnownSubscriptions(subs)
        })
    }, [client, lists])

    useEffect(() => {
        client.api
            .fetchWithCredential(client.host, '/api/v1/entity', {
                method: 'GET'
            })
            .then((res) => {
                if (res.status === 403) {
                    setIsRegistered(false)
                }
                res.json().then((json) => {
                    setEntity(json.content)
                })
            })
            .catch((e) => {
                console.error(e)
                setDomainIsOffline(true)
            })
    }, [client])

    const setSwitchToSub = useCallback((state: boolean) => {
        setKeyModalOpen(state)
    }, [])

    return (
        <GlobalStateContext.Provider
            value={{
                isCanonicalUser,
                isRegistered,
                isDomainOffline,
                isMobileSize,
                isMasterSession,
                allKnownTimelines,
                allKnownSubscriptions,
                listedSubscriptions,
                reloadList,
                allProfiles,
                getImageURL,
                setSwitchToSub,
                switchToSubOpen
            }}
        >
            {children}
        </GlobalStateContext.Provider>
    )
}

export function useGlobalState(): GlobalState {
    const context = useContext(GlobalStateContext)
    if (context === undefined) {
        return {
            isCanonicalUser: false,
            isRegistered: false,
            isDomainOffline: false,
            isMasterSession: false,
            isMobileSize: false,
            allKnownTimelines: [],
            allKnownSubscriptions: [],
            listedSubscriptions: {},
            reloadList: () => {},
            allProfiles: [],
            getImageURL: (url?: string, _options?: any) => url ?? '',
            setSwitchToSub: (_state: boolean) => {},
            switchToSubOpen: false
        }
    }
    return context
}
