import { Box, Divider, ListItem, ListItemIcon, ListItemText, Typography, useTheme } from '@mui/material'
import React, { memo, useCallback, useEffect, useState, useRef, forwardRef, type ForwardedRef } from 'react'
import { AssociationFrame } from '../Association/AssociationFrame'
import { useApi } from '../../context/api'
import { InspectorProvider } from '../../context/Inspector'
import { Loading } from '../ui/Loading'
import { MessageContainer } from '../Message/MessageContainer'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import HeartBrokenIcon from '@mui/icons-material/HeartBroken'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import SyncIcon from '@mui/icons-material/Sync'
import { type Timeline as CoreTimeline } from '@concurrent-world/client'
import { useRefWithForceUpdate } from '../../hooks/useRefWithForceUpdate'
import useSound from 'use-sound'
import { usePreference } from '../../context/PreferenceContext'
import { VList, type VListHandle } from 'virtua'

export interface TimelineProps {
    streams: string[]
    perspective?: string
    header?: JSX.Element
}

const PTR_HEIGHT = 60

const divider = <Divider variant="inset" component="li" sx={{ mx: 1, mt: 1 }} />

const timeline = forwardRef((props: TimelineProps, ref: ForwardedRef<VListHandle>): JSX.Element => {
    const client = useApi()
    const theme = useTheme()
    const pref = usePreference()

    const [timeline, timelineChanged] = useRefWithForceUpdate<CoreTimeline | null>(null)

    const [hasMoreData, setHasMoreData] = useState<boolean>(false)
    const [isFetching, setIsFetching] = useState<boolean>(false)

    const [touchPosition, setTouchPosition] = useState<number>(0)
    const [loaderSize, setLoaderSize] = useState<number>(0)
    const [loadable, setLoadable] = useState<boolean>(false)
    const [ptrEnabled, setPtrEnabled] = useState<boolean>(false)

    const [playBubble] = useSound(pref?.postSound, { volume: pref?.volume / 100, interrupt: false })
    const playBubbleRef = useRef(playBubble)

    useEffect(() => {
        playBubbleRef.current = playBubble
    }, [playBubble])

    useEffect(() => {
        if (props.streams.length === 0) return
        console.log('Timeline: streams changed', props.streams)
        const mt = client.newTimeline().then((t) => {
            timeline.current = t
            timeline.current.listen(props.streams).then((hasMore) => {
                setHasMoreData(hasMore)
            })
            t.onUpdate = () => {
                timelineChanged()
            }
            t.onRealtimeEvent = (event) => {
                if (event.type === 'message' && event.action === 'create') {
                    playBubbleRef.current()
                }
            }
            return t
        })
        return () => {
            mt.then((t) => {
                t.dispose()
            })
        }
    }, [props.streams])

    const scrollParentRef = useRef<HTMLDivElement>(null)

    const onTouchStart = useCallback((raw: Event) => {
        const e = raw as TouchEvent
        setTouchPosition(e.touches[0].clientY)
        setLoadable(scrollParentRef.current?.scrollTop === 0)
    }, [])

    const onTouchMove = useCallback(
        (raw: Event) => {
            if (!loadable) return
            const e = raw as TouchEvent
            if (!scrollParentRef.current) return
            const delta = e.touches[0].clientY - touchPosition
            setLoaderSize(Math.min(Math.max(delta, 0), PTR_HEIGHT))
            if (delta >= PTR_HEIGHT) setPtrEnabled(true)
        },
        [scrollParentRef.current, touchPosition]
    )

    const onTouchEnd = useCallback(() => {
        setLoaderSize(0)
        if (ptrEnabled) {
            if (isFetching) {
                setPtrEnabled(false)
                return
            }
            setIsFetching(true)
            setHasMoreData(false)
            setTimeout(() => {
                timeline.current?.reload().then((hasMore) => {
                    setHasMoreData(hasMore)
                    setIsFetching(false)
                    setPtrEnabled(false)
                })
            }, 1000)
        }
    }, [ptrEnabled, setPtrEnabled, props.streams, client.api, isFetching])

    useEffect(() => {
        if (!scrollParentRef.current) return
        scrollParentRef.current.addEventListener('touchstart', onTouchStart)
        scrollParentRef.current.addEventListener('touchmove', onTouchMove)
        scrollParentRef.current.addEventListener('touchend', onTouchEnd)
        return () => {
            scrollParentRef.current?.removeEventListener('touchstart', onTouchStart)
            scrollParentRef.current?.removeEventListener('touchmove', onTouchMove)
            scrollParentRef.current?.removeEventListener('touchend', onTouchEnd)
        }
    }, [scrollParentRef.current, onTouchStart, onTouchMove, onTouchEnd])

    const count = timeline.current?.body.length ?? 0

    return (
        <InspectorProvider>
            <Box
                sx={{
                    height: `${ptrEnabled ? PTR_HEIGHT : loaderSize}px`,
                    width: '100%',
                    position: 'relative',
                    color: 'text.secondary',
                    display: 'flex',
                    transition: 'height 0.2s ease-in-out',
                    overflow: 'hidden'
                }}
            >
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height={`${PTR_HEIGHT}px`}
                    position="absolute"
                    width="100%"
                    bottom="0"
                    left="0"
                >
                    {isFetching ? (
                        <SyncIcon
                            sx={{
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(-360deg)' }
                                }
                            }}
                        />
                    ) : (
                        <ArrowUpwardIcon
                            sx={{
                                transform: `rotate(${ptrEnabled ? 0 : 180}deg)`,
                                transition: 'transform 0.2s ease-in-out'
                            }}
                        />
                    )}
                </Box>
            </Box>
            <Box ref={scrollParentRef} display="flex" flex={1}>
                <VList
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        listStyle: 'none'
                    }}
                    onRangeChange={(_, end) => {
                        if (end + 3 > count && hasMoreData) {
                            console.log('readMore!!')
                            timeline.current?.readMore()
                        }
                    }}
                    ref={ref}
                >
                    {props.header}
                    {timeline.current?.body.map((e) => {
                        let element
                        switch (e.type) {
                            case 'message':
                                element = (
                                    <MessageContainer
                                        messageID={e.objectID}
                                        messageOwner={e.owner}
                                        lastUpdated={e.lastUpdate?.getTime() ?? 0}
                                        after={divider}
                                        timestamp={e.cdate}
                                    />
                                )
                                break
                            case 'association':
                                element = (
                                    <AssociationFrame
                                        association={e}
                                        lastUpdated={e.lastUpdate?.getTime() ?? 0}
                                        after={divider}
                                        perspective={props.perspective}
                                    />
                                )
                                break
                            default:
                                element = <Typography>Unknown message type: {e.type}</Typography>
                                break
                        }

                        return (
                            <React.Fragment key={e.objectID}>
                                <ErrorBoundary FallbackComponent={renderError}>
                                    <Box padding={1}>{element}</Box>
                                </ErrorBoundary>
                            </React.Fragment>
                        )
                    })}
                    {isFetching && <Loading key={0} message="Loading..." color={theme.palette.text.primary} />}
                </VList>
            </Box>
        </InspectorProvider>
    )
})
timeline.displayName = 'timeline'

const renderError = ({ error }: FallbackProps): JSX.Element => {
    return (
        <ListItem>
            <ListItemIcon>
                <HeartBrokenIcon />
            </ListItemIcon>
            <ListItemText primary="この要素の描画中に問題が発生しました" secondary={error?.message} />
        </ListItem>
    )
}

export const Timeline = memo(timeline)
Timeline.displayName = 'Timeline'
