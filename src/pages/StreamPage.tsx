import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Divider, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { TimelineHeader } from '../components/TimelineHeader'
import { useClient } from '../context/ClientContext'
import { Timeline } from '../components/Timeline/main'
import { StreamInfo } from '../components/StreamInfo'
import { usePreference } from '../context/PreferenceContext'
import {
    type ReadAccessRequestAssociationSchema,
    type CommunityTimelineSchema,
    type Timeline as typeTimeline,
    Schemas,
    type Association
} from '@concurrent-world/client'
import { CCDrawer } from '../components/ui/CCDrawer'
import WatchingStreamContextProvider from '../context/WatchingStreamContext'
import { type VListHandle } from 'virtua'

import TagIcon from '@mui/icons-material/Tag'
import TuneIcon from '@mui/icons-material/Tune'
import InfoIcon from '@mui/icons-material/Info'
import LockIcon from '@mui/icons-material/Lock'
import { useGlobalState } from '../context/GlobalState'
import { CCPostEditor } from '../components/Editor/CCPostEditor'
import { useEditorModal } from '../components/EditorModal'

export const StreamPage = memo((): JSX.Element => {
    const { client } = useClient()
    const { allKnownTimelines } = useGlobalState()

    const { id } = useParams()

    const [showEditorOnTop] = usePreference('showEditorOnTop')
    const [showEditorOnTopMobile] = usePreference('showEditorOnTopMobile')

    const timelineRef = useRef<VListHandle>(null)

    const targetStreamID = id ?? ''
    const [targetStream, setTargetStream] = useState<typeTimeline<CommunityTimelineSchema> | null>(null)

    const [streamInfoOpen, setStreamInfoOpen] = useState<boolean>(false)

    const [associations, setAssociations] = useState<Array<Association<any>>>([])
    const [update, setUpdate] = useState<number>(0)

    const isOwner = useMemo(() => {
        return targetStream?.author === client.ccid
    }, [targetStream])

    const isRestricted = targetStream?.policy === 'https://policy.concrnt.world/t/inline-read-write.json'

    const writeable = isRestricted
        ? targetStream?.policyParams?.isWritePublic
            ? true
            : targetStream?.policyParams?.writer?.includes(client.ccid ?? '')
        : true

    const readable = isRestricted
        ? targetStream?.policyParams?.isReadPublic
            ? true
            : targetStream?.policyParams?.reader?.includes(client.ccid ?? '')
        : true

    const streams = useMemo(() => {
        return targetStream ? [targetStream] : []
    }, [targetStream])

    const streamIDs = useMemo(() => {
        return targetStream ? [targetStream.id] : []
    }, [targetStream])

    useEffect(() => {
        client.getTimeline<CommunityTimelineSchema>(targetStreamID).then((stream) => {
            if (stream) {
                setTargetStream(stream)
                document.title = `#${stream.document.body.name} - Concrnt`

                stream.getAssociations().then((assocs) => {
                    setAssociations(assocs)
                })
            }
        })
    }, [id, update])

    const myRequest = useMemo(() => {
        return associations.find((assoc) => {
            return assoc.schema === Schemas.readAccessRequestAssociation && assoc.author === client.ccid
        })
    }, [associations])

    const editorModal = useEditorModal()
    useEffect(() => {
        if (!targetStream) return
        const opts = {
            streamPickerInitial: [targetStream]
        }
        editorModal.registerOptions(opts)
        return () => {
            editorModal.unregisterOptions(opts)
        }
    }, [targetStream])

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    minHeight: '100%',
                    backgroundColor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <TimelineHeader
                    title={targetStream?.document.body.name ?? 'Not Found'}
                    titleIcon={isRestricted ? <LockIcon /> : <TagIcon />}
                    secondaryAction={isOwner ? <TuneIcon /> : <InfoIcon />}
                    onTitleClick={() => {
                        timelineRef.current?.scrollToIndex(0, { align: 'start', smooth: true })
                    }}
                    onSecondaryActionClick={() => {
                        setStreamInfoOpen(true)
                    }}
                />
                {readable ? (
                    <WatchingStreamContextProvider watchingStreams={streamIDs}>
                        <Timeline
                            streams={streamIDs}
                            ref={timelineRef}
                            header={
                                (writeable && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: {
                                                    xs: showEditorOnTopMobile ? 'block' : 'none',
                                                    sm: showEditorOnTop ? 'block' : 'none'
                                                }
                                            }}
                                        >
                                            <CCPostEditor
                                                minRows={3}
                                                maxRows={7}
                                                streamPickerInitial={streams}
                                                streamPickerOptions={[...new Set([...allKnownTimelines, ...streams])]}
                                                sx={{
                                                    p: 1
                                                }}
                                            />
                                            <Divider sx={{ mx: { xs: 0.5, sm: 1, md: 1 } }} />
                                        </Box>
                                    </Box>
                                )) ||
                                undefined
                            }
                        />
                    </WatchingStreamContextProvider>
                ) : (
                    <Box>
                        <StreamInfo id={targetStreamID} />
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '100%',
                                gap: 2
                            }}
                        >
                            <LockIcon
                                sx={{
                                    fontSize: '10rem'
                                }}
                            />
                            <Typography variant="h5">このタイムラインはプライベートです。</Typography>
                            <Button
                                variant={myRequest ? 'outlined' : 'contained'}
                                onClick={() => {
                                    if (!targetStream) return
                                    if (myRequest) {
                                        myRequest.delete().then(() => {
                                            setUpdate((prev) => prev + 1)
                                        })
                                    } else {
                                        const id = targetStream.id.split('@')[0]
                                        client.api
                                            .createAssociation<ReadAccessRequestAssociationSchema>(
                                                Schemas.readAccessRequestAssociation,
                                                {},
                                                id,
                                                targetStream.author,
                                                ['world.concrnt.t-notify@' + targetStream.author]
                                            )
                                            .then(() => {
                                                setUpdate((prev) => prev + 1)
                                            })
                                    }
                                }}
                            >
                                {myRequest ? 'リクエスト済み' : 'リクエストする'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>
            <CCDrawer
                open={streamInfoOpen}
                onClose={() => {
                    setStreamInfoOpen(false)
                }}
            >
                <StreamInfo
                    detailed
                    id={targetStreamID}
                    writers={targetStream?.policyParams?.writer}
                    readers={targetStream?.policyParams?.reader}
                />
            </CCDrawer>
        </>
    )
})
StreamPage.displayName = 'StreamPage'
