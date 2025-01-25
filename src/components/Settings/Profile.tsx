import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Divider,
    Grid,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    TextField,
    Typography
} from '@mui/material'
import { ProfileEditor } from '../ProfileEditor'
import { useClient } from '../../context/ClientContext'
import { useSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import {
    type ProfileSchema,
    type CoreProfile,
    type Schema,
    type BadgeRef,
    Schemas,
    type SubprofileTimelineSchema,
    type EmptyTimelineSchema,
    type Timeline,
    type User,
    type Association,
    type ReadAccessRequestAssociationSchema
} from '@concurrent-world/client'
import { useEffect, useState } from 'react'
import { CCDrawer } from '../ui/CCDrawer'
import { CCEditor } from '../ui/cceditor'
import ManageSearchIcon from '@mui/icons-material/ManageSearch'

import PublishIcon from '@mui/icons-material/Publish'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

import { useLocation } from 'react-router-dom'
import { type Badge } from '../../model'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { usePreference } from '../../context/PreferenceContext'
import { useConcord } from '../../context/ConcordContext'
import { useConfirm } from '../../context/Confirm'
import { CCUserChip } from '../ui/CCUserChip'
import { UserPicker } from '../ui/UserPicker'
import { WatchRequestAcceptButton } from '../WatchRequestAccpetButton'
import { SubprofileCardWithEdit } from '../SubprofileCardWithEdit'

export const ProfileSettings = (): JSX.Element => {
    const { client } = useClient()
    const concord = useConcord()
    const { enqueueSnackbar } = useSnackbar()
    const [enableConcord] = usePreference('enableConcord')
    const confirm = useConfirm()

    const { t } = useTranslation('', { keyPrefix: 'settings.profile' })

    const path = useLocation()
    const hash = path.hash.replace('#', '')

    const [allProfiles, setAllProfiles] = useState<Array<CoreProfile<any>>>([])
    const [openProfileEditor, setOpenProfileEditor] = useState(false)
    const [openReaderEditor, setOpenReaderEditor] = useState<((_: User[]) => void) | null>(null)

    const [schemaURLDraft, setSchemaURLDraft] = useState<string>('https://schema.concrnt.world/p/basic.json')
    const [schemaURL, setSchemaURL] = useState<any>(null)

    const [latestProfile, setLatestProfile] = useState<ProfileSchema | null | undefined>(client.user?.profile)

    const [subprofileDraft, setSubprofileDraft] = useState<any>(null)
    const [badges, setBadges] = useState<Badge[]>([])

    const [homeTimeline, setHomeTimeline] = useState<Timeline<EmptyTimelineSchema> | null>(null)
    const homeIsPublic = homeTimeline?.policyParams?.isReadPublic

    const [update, setUpdate] = useState(0)

    const [selectedUsers, setSelectedUsers] = useState<User[]>([])

    const [requests, setRequests] = useState<Array<Association<ReadAccessRequestAssociationSchema>>>([])

    const load = (): void => {
        setUpdate((prev) => prev + 1)
    }

    useEffect(() => {
        if (!client?.ccid) return
        if (!client.user?.profile) return

        client.api.getProfileBySemanticID<ProfileSchema>('world.concrnt.p', client.ccid).then((profile) => {
            setLatestProfile(profile?.document.body)
            client.api.getProfiles({ author: client.ccid }).then((profiles) => {
                const subprofiles = (profiles ?? []).filter((p) => p.id !== profile?.id)
                setAllProfiles(subprofiles)
            })
        })

        client.getTimeline<EmptyTimelineSchema>(client.user.homeTimeline).then((timeline) => {
            setHomeTimeline(timeline)
            if (!timeline) return
            timeline.getAssociations().then((assocs) => {
                setRequests(assocs.filter((e) => e.schema === Schemas.readAccessRequestAssociation))
            })
        })

        concord.getBadges(client.ccid).then((badges) => {
            setBadges(badges)
        })
    }, [client, update])

    useEffect(() => {
        let isMounted = true
        const timer = setTimeout(() => {
            if (isMounted) {
                setSchemaURL(schemaURLDraft)
            }
        }, 300)
        return () => {
            isMounted = false
            clearTimeout(timer)
        }
    }, [schemaURLDraft])

    useEffect(() => {
        if (hash) {
            setSchemaURLDraft(hash)
            setOpenProfileEditor(true)
        }
    }, [hash])

    const [badgeMenuAnchor, setBadgeMenuAnchor] = useState<null | HTMLElement>(null)
    const [selectedBadge, setSelectedBadge] = useState<null | Badge>(null)
    const [badgeAction, setBadgeAction] = useState<null | 'publish' | 'unpublish'>(null)

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1
            }}
        >
            <Typography variant="h3">{t('title')}</Typography>
            <Box
                sx={{
                    width: '100%',
                    borderRadius: 1,
                    overflow: 'hidden',
                    mb: 1
                }}
            >
                <ProfileEditor
                    id={''}
                    initial={client?.user?.profile}
                    onSubmit={() => {
                        enqueueSnackbar(t('updated'), { variant: 'success' })
                    }}
                />
            </Box>

            {homeIsPublic ? (
                <Alert
                    severity="info"
                    action={
                        <Button
                            variant="text"
                            color="inherit"
                            size="small"
                            onClick={() => {
                                confirm.open(
                                    'ホーム投稿の閲覧者を制限しますか？',
                                    () => {
                                        if (!homeTimeline) return
                                        const currentPolicy = homeTimeline.policyParams
                                        currentPolicy.isReadPublic = false
                                        if (!currentPolicy.reader.includes(client.ccid)) {
                                            currentPolicy.reader.push(client.ccid)
                                        }
                                        client.api
                                            .upsertTimeline(
                                                Schemas.emptyTimeline,
                                                {},
                                                {
                                                    semanticID: 'world.concrnt.t-home',
                                                    indexable: false,
                                                    policy: 'https://policy.concrnt.world/t/inline-read-write.json',
                                                    policyParams: JSON.stringify(currentPolicy)
                                                }
                                            )
                                            .then(() => {
                                                homeTimeline.invalidate()
                                                load()
                                            })
                                    },
                                    {
                                        description:
                                            '制限するとホームに投稿された内容は、個別に指定したユーザーのみが閲覧できるようになります。'
                                    }
                                )
                            }}
                        >
                            閲覧できる人を制限する
                        </Button>
                    }
                >
                    <AlertTitle>ホーム投稿は一般公開に設定されています</AlertTitle>
                    制限付きのタイムラインへの投稿を除いた投稿がだれでも閲覧可能です。
                </Alert>
            ) : (
                <Alert
                    severity="info"
                    action={
                        <Button
                            variant="text"
                            color="inherit"
                            size="small"
                            onClick={() => {
                                confirm.open(
                                    'ホーム投稿を一般公開にしますか？',
                                    () => {
                                        if (!homeTimeline) return
                                        const currentPolicy = homeTimeline.policyParams
                                        currentPolicy.isReadPublic = true
                                        client.api
                                            .upsertTimeline(
                                                Schemas.emptyTimeline,
                                                {},
                                                {
                                                    semanticID: 'world.concrnt.t-home',
                                                    indexable: false,
                                                    policy: 'https://policy.concrnt.world/t/inline-read-write.json',
                                                    policyParams: JSON.stringify(currentPolicy)
                                                }
                                            )
                                            .then(() => {
                                                homeTimeline.invalidate()
                                                load()
                                            })
                                    },
                                    {
                                        description:
                                            '一般公開にすると過去の投稿も含めて全てのユーザーが閲覧できるようになります。'
                                    }
                                )
                            }}
                        >
                            一般公開にする
                        </Button>
                    }
                >
                    <AlertTitle>ホーム投稿の閲覧ユーザーを制限しています</AlertTitle>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1
                        }}
                    >
                        ホームに投稿された内容は、以下のユーザーが閲覧できます。
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                flexWrap: 'wrap'
                            }}
                        >
                            {homeTimeline?.policyParams?.reader?.map((e: string) => (
                                <CCUserChip avatar key={e} ccid={e} />
                            ))}
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                if (!homeTimeline) return

                                Promise.all(
                                    homeTimeline.policyParams.reader.map((e: string) => client.getUser(e))
                                ).then((users) => {
                                    setSelectedUsers(users.filter((u) => u) as User[])
                                })

                                setOpenReaderEditor(() => (update: User[]) => {
                                    const reader = update.map((u) => u.ccid)
                                    const currentPolicy = homeTimeline.policyParams
                                    currentPolicy.reader = reader
                                    client.api
                                        .upsertTimeline(
                                            Schemas.emptyTimeline,
                                            {},
                                            {
                                                semanticID: 'world.concrnt.t-home',
                                                indexable: false,
                                                policy: 'https://policy.concrnt.world/t/inline-read-write.json',
                                                policyParams: JSON.stringify(currentPolicy)
                                            }
                                        )
                                        .then(() => {
                                            homeTimeline.invalidate()
                                            load()
                                        })
                                })
                            }}
                        >
                            閲覧ユーザーを編集
                        </Button>
                        {requests.length > 0 && homeTimeline && (
                            <>
                                <Divider />
                                <Typography variant="h4">閲覧リクエスト</Typography>
                                <Box>
                                    {requests.map((request) => (
                                        <WatchRequestAcceptButton
                                            key={request.id}
                                            request={request}
                                            targetTimeline={homeTimeline}
                                            onAccept={() => {
                                                load()
                                            }}
                                        />
                                    ))}
                                </Box>
                            </>
                        )}
                    </Box>
                </Alert>
            )}

            {enableConcord && badges.length > 0 && (
                <>
                    <Typography variant="h3">バッジ</Typography>
                    <Box>
                        <Grid container spacing={2}>
                            {badges.map((badge) => {
                                const published = latestProfile?.badges?.find(
                                    (b) => b.badgeId === badge.badgeId && b.seriesId === badge.classId
                                )
                                return (
                                    <Grid item key={badge.badgeId}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                                width: '80px',
                                                height: '80px',
                                                position: 'relative',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => {
                                                setBadgeMenuAnchor(e.currentTarget)
                                                setSelectedBadge(badge)
                                                setBadgeAction(published ? 'unpublish' : 'publish')
                                            }}
                                        >
                                            {published && (
                                                <CheckCircleIcon
                                                    sx={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        bottom: 0,
                                                        color: 'primary.main',
                                                        fontSize: '2rem',
                                                        backgroundColor: 'background.paper',
                                                        borderRadius: '50%',
                                                        transform: 'translate(20%, 20%)'
                                                    }}
                                                />
                                            )}
                                            <Box
                                                component="img"
                                                src={badge.uri}
                                                alt={badge.name}
                                                sx={{
                                                    borderRadius: 1
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                )
                            })}
                        </Grid>
                        <Menu
                            anchorEl={badgeMenuAnchor}
                            open={Boolean(badgeMenuAnchor)}
                            onClose={() => {
                                setBadgeMenuAnchor(null)
                            }}
                        >
                            {badgeAction === 'publish' && (
                                <MenuItem
                                    onClick={() => {
                                        if (!latestProfile || !selectedBadge) return
                                        const newBadgeRef: BadgeRef = {
                                            badgeId: selectedBadge.badgeId,
                                            seriesId: selectedBadge.classId
                                        }
                                        const badges = [...(latestProfile.badges ?? []), newBadgeRef]
                                        client
                                            .setProfile({
                                                badges
                                            })
                                            .then((_) => {
                                                setBadgeMenuAnchor(null)
                                                load()
                                            })
                                    }}
                                >
                                    <ListItemIcon>
                                        <PublishIcon />
                                    </ListItemIcon>
                                    <ListItemText>公開する</ListItemText>
                                </MenuItem>
                            )}
                            {badgeAction === 'unpublish' && (
                                <MenuItem
                                    onClick={() => {
                                        if (!latestProfile || !selectedBadge) return
                                        const badges = (latestProfile.badges ?? []).filter(
                                            (b) =>
                                                b.badgeId !== selectedBadge.badgeId ||
                                                b.seriesId !== selectedBadge.classId
                                        )
                                        client
                                            .setProfile({
                                                badges
                                            })
                                            .then((_) => {
                                                setBadgeMenuAnchor(null)
                                                load()
                                            })
                                    }}
                                >
                                    <ListItemIcon>
                                        <VisibilityOffIcon />
                                    </ListItemIcon>
                                    <ListItemText>非公開にする</ListItemText>
                                </MenuItem>
                            )}
                            <MenuItem
                                onClick={() => {
                                    if (!selectedBadge) return
                                    concord.inspectBadge({
                                        seriesId: selectedBadge.classId,
                                        badgeId: selectedBadge.badgeId
                                    })
                                    setBadgeMenuAnchor(null)
                                }}
                            >
                                <ListItemIcon>
                                    <ManageSearchIcon />
                                </ListItemIcon>
                                <ListItemText>詳細</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Box>
                </>
            )}
            {enableConcord && badges.length > 0 && (
                <Button
                    variant="outlined"
                    onClick={() => {
                        confirm.open('バッジを全部外しますか？', () => {
                            client
                                .setProfile({
                                    badges: []
                                })
                                .then((_) => {
                                    load()
                                })
                        })
                    }}
                >{`バッジを全部外す(現在${latestProfile?.badges?.length ?? 0}個)`}</Button>
            )}

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Typography variant="h3">サブプロフィール</Typography>
                <Button
                    onClick={() => {
                        setSubprofileDraft({})
                        setOpenProfileEditor(true)
                    }}
                >
                    新規
                </Button>
            </Box>
            {latestProfile &&
                allProfiles.map((character) => (
                    <SubprofileCardWithEdit
                        key={character.id}
                        mainProfile={latestProfile}
                        subProfile={character}
                        onModified={() => {
                            load()
                        }}
                    />
                ))}
            <CCDrawer
                open={openProfileEditor}
                onClose={() => {
                    setOpenProfileEditor(false)
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
                    {openProfileEditor && (
                        <>
                            <Typography variant="h3">新規サブプロフィール</Typography>
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
                                    client.api
                                        .upsertProfile(schemaURL as Schema, subprofileDraft, {})
                                        .then((profile) => {
                                            client.api
                                                .upsertTimeline<SubprofileTimelineSchema>(
                                                    Schemas.subprofileTimeline,
                                                    {
                                                        subprofile: profile.id
                                                    },
                                                    {
                                                        owner: client.ccid,
                                                        indexable: false,
                                                        policy: 'https://policy.concrnt.world/t/inline-read-write.json',
                                                        policyParams: `{"isWritePublic": false, "isReadPublic": true, "writer": ["${client.ccid}"], "reader": []}`,
                                                        semanticID: 'world.concrnt.t-subhome.' + profile.id
                                                    }
                                                )
                                                .then((_) => {
                                                    setOpenProfileEditor(false)
                                                    load()
                                                })
                                        })
                                }}
                            >
                                作成
                            </Button>
                        </>
                    )}
                </Box>
            </CCDrawer>
            <CCDrawer
                open={openReaderEditor !== null}
                onClose={() => {
                    setOpenReaderEditor(null)
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
                    <Typography variant="h3">閲覧ユーザーの編集</Typography>
                    <UserPicker selected={selectedUsers} setSelected={setSelectedUsers} />
                    <Button
                        onClick={() => {
                            openReaderEditor?.(selectedUsers)
                            setOpenReaderEditor(null)
                        }}
                    >
                        更新
                    </Button>
                </Box>
            </CCDrawer>
        </Box>
    )
}
