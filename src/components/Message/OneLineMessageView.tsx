import { Box, IconButton, Tooltip } from '@mui/material'
import { Link as routerLink } from 'react-router-dom'
import { CCAvatar } from '../ui/CCAvatar'
import { TimeDiff } from '../ui/TimeDiff'
import {
    type Message,
    type ReplyMessageSchema,
    type MarkdownMessageSchema,
    type CoreProfile
} from '@concurrent-world/client'
import { MarkdownRendererLite } from '../ui/MarkdownRendererLite'
import { MarkdownRenderer } from '../ui/MarkdownRenderer'
import { useEffect, useState } from 'react'
import { useClient } from '../../context/ClientContext'
import { CCLink } from '../ui/CCLink'

export interface OneLineMessageViewProps {
    message: Message<MarkdownMessageSchema | ReplyMessageSchema>
}

export const OneLineMessageView = (props: OneLineMessageViewProps): JSX.Element => {
    const { client } = useClient()

    const [characterOverride, setProfileOverride] = useState<CoreProfile<any> | undefined>(undefined)

    const externalLink = props.message.document.meta?.apObjectRef // Link to external message

    useEffect(() => {
        if (!(client && props.message.document.body.profileOverride?.profileID)) return
        client.api
            .getProfileByID(props.message.document.body.profileOverride?.profileID, props.message.author)
            .then((profile) => {
                setProfileOverride(profile ?? undefined)
            })
    }, [client, props.message])

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'text.disabled',
                overflow: 'hidden',
                flex: 1,
                gap: { xs: 1, sm: 2 }
            }}
        >
            <IconButton
                sx={{
                    width: { xs: '38px', sm: '48px' },
                    height: { xs: '12px', sm: '18px' }
                }}
                component={routerLink}
                to={'/' + props.message.author}
            >
                <CCAvatar
                    alt={props.message.authorUser?.profile?.username}
                    avatarURL={props.message.authorUser?.profile?.avatar}
                    identiconSource={props.message.author}
                    avatarOverride={
                        characterOverride?.document.body.avatar ?? props.message.document.body.profileOverride?.avatar
                    }
                    sx={{
                        width: { xs: '38px', sm: '48px' },
                        height: { xs: '12px', sm: '18px' }
                    }}
                />
            </IconButton>
            <Box display="flex" flex={1} overflow="hidden">
                <Box
                    overflow="hidden"
                    whiteSpace="nowrap"
                    textOverflow="ellipsis"
                    minWidth={0}
                    sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                >
                    <CCLink
                        underline="none"
                        color="inherit"
                        fontSize="0.75rem"
                        to={externalLink ?? `/${props.message.author}/${props.message.id}`}
                    >
                        <Tooltip
                            arrow
                            placement="top"
                            title={
                                <MarkdownRenderer
                                    messagebody={props.message.document.body.body}
                                    emojiDict={props.message.document.body.emojis ?? {}}
                                />
                            }
                        >
                            <Box>
                                <MarkdownRendererLite
                                    messagebody={props.message.document.body.body}
                                    emojiDict={props.message.document.body.emojis ?? {}}
                                    forceOneline={true}
                                />
                            </Box>
                        </Tooltip>
                    </CCLink>
                </Box>
            </Box>
            <CCLink
                underline="hover"
                color="inherit"
                fontSize="0.75rem"
                to={externalLink ?? `/${props.message.author}/${props.message.id}`}
            >
                <TimeDiff date={new Date(props.message.cdate)} />
            </CCLink>
        </Box>
    )
}
