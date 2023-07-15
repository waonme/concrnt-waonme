import { Schemas, type M_Current, type M_Reply, type M_Reroute } from '@concurrent-world/client'
import { useApi } from '../../context/api'
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ReplyMessageFrame } from './Message/ReplyMessageFrame'
import { ReRouteMessageFrame } from './Message/ReRouteMessageFrame'
import { MessageSkeleton } from '../MessageSkeleton'
import { Typography } from '@mui/material'
import { useInspector } from '../../context/Inspector'
import { useMessageDetail } from '../../context/MessageDetail'
import { MessageView } from './Message/MessageView'

export interface MessageServiceState {
    addFavorite: () => void
    removeFavorite: () => void
    addReaction: (shortcode: string, img: string) => void
    removeReaction: (id: string) => void
    openInspector: () => void
    openReply: () => void
    openReroute: () => void
    deleteMessage: () => void
}

const MessageServiceContext = createContext<MessageServiceState | undefined>(undefined)

export function useMessageService(): MessageServiceState {
    return useContext(MessageServiceContext) as MessageServiceState
}

interface MessageContainerProps {
    messageID: string
    messageOwner: string
    lastUpdated?: number
    after?: JSX.Element | undefined
}

export const MessageContainer = memo<MessageContainerProps>((props: MessageContainerProps): JSX.Element | null => {
    const client = useApi()
    const inspector = useInspector()
    const messageDetail = useMessageDetail()
    const [message, setMessage] = useState<M_Current | M_Reroute | M_Reply | null>()
    const [isFetching, setIsFetching] = useState<boolean>(false)

    const loadMessage = useCallback((): void => {
        if (isFetching) return
        setIsFetching(true)
        client
            .getMessage(props.messageID, props.messageOwner)
            .then((msg) => {
                setMessage(msg)
            })
            .finally(() => {
                setIsFetching(false)
            })
    }, [props.messageID, props.messageOwner])

    const reloadMessage = useCallback((): void => {
        client.api.invalidateMessage(props.messageID)
        loadMessage()
    }, [client, props.messageID])

    const addFavorite = useCallback(async () => {
        if (!message) return
        await client.favorite(message)
        reloadMessage()
    }, [client, message])

    const removeFavorite = useCallback(async () => {
        if (!message) return
        await client.unFavorite(message)
        reloadMessage()
    }, [client, message])

    const deleteMessage = useCallback((): void => {
        if (!message) return
        client.deleteMessage(message).then(() => {
            reloadMessage()
        })
    }, [client, message])

    const addReaction = useCallback(
        (shortcode: string, img: string) => {
            if (!message) return
            client.addReaction(message, shortcode, img).then(() => {
                reloadMessage()
            })
        },
        [client, message]
    )

    const removeReaction = useCallback(
        (id: string) => {
            if (!message) return
            client.removeAssociation(message, id).then(() => {
                reloadMessage()
            })
        },
        [client, message]
    )

    const openInspector = useCallback(() => {
        if (!message) return
        inspector.inspectItem({ messageId: message.id, author: message.author.ccaddr })
    }, [inspector, message])

    const openReply = useCallback(() => {
        if (!message) return
        messageDetail.openAction('reply', message.id, message.author.ccaddr)
    }, [message, messageDetail])

    const openReroute = useCallback(() => {
        if (!message) return
        messageDetail.openAction('reroute', message.id, message.author.ccaddr)
    }, [message, messageDetail])

    useEffect(() => {
        loadMessage()
    }, [props.messageID, props.messageOwner, props.lastUpdated])

    const services = useMemo(() => {
        return {
            addFavorite,
            removeFavorite,
            addReaction,
            removeReaction,
            openInspector,
            openReply,
            openReroute,
            deleteMessage
        }
    }, [addFavorite, removeFavorite, addReaction, removeReaction, openInspector, openReply, openReroute, deleteMessage])

    if (isFetching) {
        return (
            <>
                <MessageSkeleton />
                {props.after}
            </>
        )
    }

    if (!message) return null

    let body
    switch (message?.schema) {
        case Schemas.simpleNote:
            body = <MessageView message={message} lastUpdated={props.lastUpdated} userCCID={client.ccid} />
            break
        case Schemas.replyMessage:
            body = (
                <ReplyMessageFrame
                    message={message}
                    lastUpdated={props.lastUpdated}
                    reloadMessage={reloadMessage}
                    userCCID={client.ccid}
                />
            )
            break
        case Schemas.rerouteMessage:
            body = (
                <ReRouteMessageFrame message={message} lastUpdated={props.lastUpdated} reloadMessage={reloadMessage} />
            )
            break
        default:
            body = <Typography>unknown schema: {(message as any).schema}</Typography>
            break
    }

    return (
        <MessageServiceContext.Provider value={services}>
            {body}
            {props.after}
        </MessageServiceContext.Provider>
    )
})

MessageContainer.displayName = 'MessageContainer'