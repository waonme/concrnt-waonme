import { Tooltip, Paper } from '@mui/material'
import {
    type CommunityTimelineSchema,
    type CoreTimeline,
    type ProfileSchema,
    Schemas,
    type SubprofileTimelineSchema,
    type Timeline
} from '@concurrent-world/client'
import TagIcon from '@mui/icons-material/Tag'
import { useClient } from '../../context/ClientContext'
import { useEffect, useState } from 'react'
import { StreamCard } from '../Stream/Card'
import { CCChip } from './CCChip'
import { FaTheaterMasks } from 'react-icons/fa'

export interface TimelineChipProps {
    timelineID?: string
}

export const TimelineChip = (props: TimelineChipProps): JSX.Element => {
    const { client } = useClient()
    const [timeline, setTimeline] = useState<Timeline<any> | null | undefined>(undefined)
    const [profile, setProfile] = useState<ProfileSchema | null | undefined>(null)

    const domain = props.timelineID?.split('@')?.[1]

    useEffect(() => {
        if (timeline !== undefined) return
        if (!props.timelineID) return
        client.getTimeline<any>(props.timelineID).then((t) => {
            setTimeline(t)

            if (!t) return
            if (t.schema === Schemas.emptyTimeline) {
                const timeline: CoreTimeline<CommunityTimelineSchema> = t
                client.getUser(timeline.author).then((user) => {
                    setProfile(user?.profile)
                })
            } else if (t.schema === Schemas.subprofileTimeline) {
                const timeline: CoreTimeline<SubprofileTimelineSchema> = t
                client.api
                    .getProfileByID<ProfileSchema>(timeline.document.body.subprofile, timeline.author)
                    .then((profile) => {
                        if (!profile) return
                        setProfile(profile.document.body)
                    })
            }
        })
    }, [])

    if (!props.timelineID) {
        return <CCChip size={'small'} label={'loading...'} icon={<TagIcon />} />
    }

    if (!timeline) {
        return <CCChip size={'small'} label={props.timelineID} icon={<TagIcon />} />
    }

    let link = `/timeline/${props.timelineID}`

    const split = props.timelineID.split('@')
    if (split[0] === 'world.concrnt.t-home') {
        link = `/${split[1]}`
    } else if (timeline.schema === Schemas.subprofileTimeline) {
        link = `/${split[1]}#${timeline.document.body.subprofile}`
    }

    return (
        <Tooltip
            enterDelay={500}
            enterNextDelay={500}
            leaveDelay={300}
            placement="top"
            components={{
                Tooltip: Paper
            }}
            componentsProps={{
                tooltip: {
                    sx: {
                        m: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        minWidth: '300px'
                    }
                }
            }}
            title={
                domain && (
                    <StreamCard
                        streamID={props.timelineID}
                        name={timeline.document.body.name}
                        description={timeline.document.body.description}
                        banner={timeline.document.body.banner ?? ''}
                        domain={domain}
                    />
                )
            }
        >
            <CCChip
                to={link}
                size={'small'}
                label={timeline?.document.body.name ?? profile?.username ?? props.timelineID}
                icon={timeline?.schema === Schemas.subprofileTimeline ? <FaTheaterMasks /> : <TagIcon />}
            />
        </Tooltip>
    )
}
