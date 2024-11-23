import {
    type CoreProfile,
    type CoreTimeline,
    type ProfileSchema,
    Schemas,
    type SubprofileTimelineSchema,
    type Timeline
} from '@concurrent-world/client'

import { useClient } from '../context/ClientContext'
import { useEffect, useState } from 'react'
import { Box, Button, ListItemIcon, ListItemText, MenuItem, TextField, Typography } from '@mui/material'

import { SubProfileCard } from './SubProfileCard'
import { useSnackbar } from 'notistack'
import { useConfirm } from '../context/Confirm'
import { CCDrawer } from './ui/CCDrawer'
import { CCEditor } from './ui/cceditor'

import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import EditIcon from '@mui/icons-material/Edit'
import MedicationIcon from '@mui/icons-material/Medication'
import PublishIcon from '@mui/icons-material/Publish'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'

interface SubprofileCardWithEditProps {
    mainProfile: ProfileSchema
    subProfile: CoreProfile<any>
    onModified?: () => void
}

export const SubprofileCardWithEdit = (props: SubprofileCardWithEditProps): JSX.Element => {
    const { client } = useClient()
    const { enqueueSnackbar } = useSnackbar()
    const confirm = useConfirm()

    const [timeline, setTimeline] = useState<Timeline<any> | null>(null)

    const enabledSubprofiles = props.mainProfile.subprofiles ?? []
    const published = enabledSubprofiles.includes(props.subProfile.id)

    const [schemaURLDraft, setSchemaURLDraft] = useState<string>('https://schema.concrnt.world/p/basic.json')
    const [schemaURL, setSchemaURL] = useState<any>(null)
    const [editingProfile, setEditingProfile] = useState<CoreProfile<any> | null>(null)
    const [subprofileDraft, setSubprofileDraft] = useState<any>(null)

    const isTimelineValid =
        timeline &&
        timeline.document.policy === 'https://policy.concrnt.world/t/inline-read-write.json' &&
        timeline.policyParams.isWritePublic === false &&
        timeline.policyParams.writer.includes(client.ccid)

    const isTimelinePrivate = timeline && timeline.policyParams.isReadPublic === false

    useEffect(() => {
        client.getTimeline('world.concrnt.t-subhome.' + props.subProfile.id + '@' + client.ccid!).then((timeline) => {
            if (!timeline) return
            setTimeline(timeline)
        })
    }, [props.subProfile.id])

    const menuItems = [
        <MenuItem
            key="publish"
            onClick={() => {
                let subprofiles
                if (published) {
                    subprofiles = enabledSubprofiles.filter((id) => id !== props.subProfile.id)
                } else {
                    subprofiles = [...enabledSubprofiles, props.subProfile.id]
                }

                client
                    .setProfile({
                        subprofiles
                    })
                    .then((_) => {
                        props.onModified?.()
                    })
            }}
        >
            <ListItemIcon>
                {published ? (
                    <VisibilityOffIcon sx={{ color: 'text.primary' }} />
                ) : (
                    <PublishIcon sx={{ color: 'text.primary' }} />
                )}
            </ListItemIcon>
            <ListItemText>{published ? <>掲載をやめる</> : <>掲載する</>}</ListItemText>
        </MenuItem>,
        <MenuItem
            key="togglePrivate"
            onClick={() => {
                if (!timeline?.policyParams) return
                const currentPolicy = timeline.policyParams
                currentPolicy.isReadPublic = !currentPolicy.isReadPublic
                client.api
                    .upsertTimeline(
                        Schemas.emptyTimeline,
                        {},
                        {
                            semanticID: 'world.concrnt.t-subhome.' + props.subProfile.id,
                            indexable: false,
                            policy: 'https://policy.concrnt.world/t/inline-read-write.json',
                            policyParams: JSON.stringify(currentPolicy)
                        }
                    )
                    .then(() => {
                        timeline.invalidate()
                        props.onModified?.()
                    })
            }}
        >
            <ListItemIcon>
                {isTimelinePrivate ? (
                    <LockOpenIcon sx={{ color: 'text.primary' }} />
                ) : (
                    <LockIcon sx={{ color: 'text.primary' }} />
                )}
            </ListItemIcon>
            <ListItemText>{isTimelinePrivate ? <>ホームを公開する</> : <>ホームを非公開にする</>}</ListItemText>
        </MenuItem>,
        <MenuItem
            key="edit"
            onClick={() => {
                setSubprofileDraft(props.subProfile.document.body)
                setEditingProfile(props.subProfile)
                setSchemaURL(props.subProfile.schema)
                setSchemaURLDraft(props.subProfile.schema)
            }}
        >
            <ListItemIcon>
                <EditIcon sx={{ color: 'text.primary' }} />
            </ListItemIcon>
            <ListItemText>編集</ListItemText>
        </MenuItem>,
        <MenuItem
            key="delete"
            disabled={published}
            onClick={() => {
                confirm.open(
                    'サブプロフィールを削除しますか？',
                    () => {
                        client.api.deleteProfile(props.subProfile.id).then((_) => {
                            props.onModified?.()
                        })
                    },
                    { confirmText: '削除' }
                )
            }}
        >
            <ListItemIcon>
                <DeleteForeverIcon sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>{published ? <>削除するには非公開にしてください</> : <>削除</>}</ListItemText>
        </MenuItem>,
        ...(!timeline || !isTimelineValid
            ? [
                  <MenuItem
                      key="fix"
                      onClick={() => {
                          client.api
                              .upsertTimeline<SubprofileTimelineSchema>(
                                  Schemas.subprofileTimeline,
                                  {
                                      subprofile: props.subProfile.id
                                  },
                                  {
                                      owner: client.ccid,
                                      indexable: false,
                                      policy: 'https://policy.concrnt.world/t/inline-read-write.json',
                                      policyParams: `{"isWritePublic": false, "isReadPublic": true, "writer": ["${client.ccid}"], "reader": []}`,
                                      semanticID: 'world.concrnt.t-subhome.' + props.subProfile.id
                                  }
                              )
                              .then((_) => {
                                  client.api.invalidateTimeline(
                                      'world.concrnt.t-subhome.' + props.subProfile.id + '@' + client.ccid!
                                  )
                                  enqueueSnackbar('サブプロフィールタイムラインを修正しました', {
                                      variant: 'success'
                                  })
                                  props.onModified?.()
                              })
                      }}
                  >
                      <ListItemIcon>
                          <MedicationIcon sx={{ color: 'text.primary' }} />
                      </ListItemIcon>
                      <ListItemText>サブプロフィールタイムラインを修正</ListItemText>
                  </MenuItem>
              ]
            : [])
    ]

    return (
        <>
            <SubProfileCard character={props.subProfile} additionalMenuItems={menuItems}>
                {published ? <>掲載中</> : <>未掲載</>}
                {isTimelinePrivate ? <LockIcon /> : <></>}
                {timeline ? (
                    <></>
                ) : (
                    <>
                        <br />
                        サブプロフィールタイムラインがありません
                    </>
                )}
                {isTimelineValid ? (
                    <></>
                ) : (
                    <>
                        <br />
                        サブプロフィールタイムラインの設定が不完全です
                    </>
                )}
            </SubProfileCard>
            <CCDrawer
                open={editingProfile !== null}
                onClose={() => {
                    setEditingProfile(null)
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '30px',
                        p: 3
                    }}
                >
                    <Typography variant="h3">サブプロフィールの編集</Typography>
                    <TextField
                        label="テンプレートのURL"
                        value={schemaURLDraft}
                        onChange={(e) => {
                            setSchemaURLDraft(e.target.value)
                        }}
                    />
                    <CCEditor schemaURL={schemaURL} value={subprofileDraft} setValue={setSubprofileDraft} />
                    <Button
                        onClick={() => {
                            if (!editingProfile) return
                            client.api
                                .upsertProfile(schemaURL, subprofileDraft, {
                                    id: editingProfile.id
                                })
                                .then((_) => {
                                    setEditingProfile(null)
                                    props.onModified?.()
                                })
                        }}
                    >
                        更新
                    </Button>
                </Box>
            </CCDrawer>
        </>
    )
}
