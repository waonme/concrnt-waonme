import { type Association, type ReadAccessRequestAssociationSchema, type Timeline } from '@concurrent-world/client'
import { CCAvatar } from './ui/CCAvatar'
import { Box, Button } from '@mui/material'
import { useClient } from '../context/ClientContext'

interface WatchRequestAcceptButtonProps {
    request: Association<ReadAccessRequestAssociationSchema>
    targetTimeline: Timeline<any>
    onAccept?: () => void
}

export const WatchRequestAcceptButton = (props: WatchRequestAcceptButtonProps): JSX.Element => {
    const { client } = useClient()
    const requester = props.request.authorUser
    const target = props.targetTimeline
    if (!requester || !target) return <></>
    return (
        <Box display="flex" alignItems="center" gap={1}>
            <CCAvatar avatarURL={requester.profile?.avatar} identiconSource={requester.ccid} />
            {requester.profile?.username}
            <Box flex={1} />
            <Button
                onClick={() => {
                    if (!target.policyParams) return
                    const currentPolicy = target.policyParams
                    currentPolicy.reader.push(requester.ccid)
                    client.api
                        .upsertTimeline(target.schema, target.document.body, {
                            id: props.targetTimeline.id.split('@')[0],
                            indexable: target.indexable,
                            policy: target.policy,
                            policyParams: JSON.stringify(currentPolicy)
                        })
                        .then(() => {
                            props.request.delete().then(() => {
                                target.invalidate()
                                props.onAccept?.()
                            })
                        })
                }}
            >
                閲覧者に追加
            </Button>
        </Box>
    )
}
