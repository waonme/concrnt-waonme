import { Box, Button, Divider, IconButton, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useClient } from '../../context/ClientContext'
import { type ApEntity } from '../../model'
import { ApSetup } from '../Activitypub/Setup'
import { ApFollowManager, APUserCard } from '../Activitypub/FollowManager'
import { CCDrawer } from '../ui/CCDrawer'
import { useNavigate } from 'react-router-dom'
import { WatchButton } from '../WatchButton'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import LuggageIcon from '@mui/icons-material/Luggage'
import { useSnackbar } from 'notistack'

export const APSettings = (): JSX.Element => {
    const { client } = useClient()
    const [entity, setEntity] = useState<ApEntity | null | undefined>(undefined)
    const [openInquiry, setOpenInquiry] = useState(false)
    const [url, setUrl] = useState('')
    const navigate = useNavigate()
    const [openMigration, setOpenMigration] = useState(false)
    const { enqueueSnackbar } = useSnackbar()
    const [aliases, setAliases] = useState<string[]>([])
    const [newAlias, setNewAlias] = useState('')

    useEffect(() => {
        const requestOptions = {
            method: 'GET',
            headers: {
                'content-type': 'application/json'
            }
        }

        client.api
            .fetchWithCredential(client.api.host, `/ap/api/entity/${client.ccid}`, requestOptions)
            .then(async (res) => await res.json())
            .then((data) => {
                console.log(data)
                setEntity(data.content)
                setAliases(data.content.aliases ?? [])
            })
            .catch((e) => {
                console.log(e)
                setEntity(null)
            })
    }, [])

    const inquery = (url: string): void => {
        client.api
            .fetchWithCredential(client.api.host, `/ap/api/import?note=${encodeURIComponent(url)}`, {
                method: 'GET',
                headers: {
                    'content-type': 'application/json'
                }
            })
            .then(async (res) => await res.json())
            .then((data) => {
                navigate(`/${data.content.author}/${data.content.id}`)
            })
    }

    if (entity === undefined) {
        return <>loading...</>
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}
        >
            {entity === null ? (
                <ApSetup />
            ) : (
                <>
                    <Box
                        display="flex"
                        flexDirection="row"
                        justifyContent="space-between"
                        gap={1}
                        width="100%"
                        alignItems="center"
                    >
                        <Box>
                            <Typography variant="h2">
                                @{entity.id}@{client.host}
                            </Typography>
                        </Box>
                        <Box display="flex" flexDirection="row" justifyContent="flex-end" gap={1} width="100%">
                            <IconButton>
                                <TravelExploreIcon
                                    onClick={() => {
                                        setOpenInquiry(true)
                                    }}
                                />
                            </IconButton>
                            <WatchButton minimal timelineID={'world.concrnt.t-ap@' + entity.ccid} />
                            <IconButton>
                                <LuggageIcon
                                    onClick={() => {
                                        setOpenMigration(true)
                                    }}
                                />
                            </IconButton>
                        </Box>
                    </Box>
                    <ApFollowManager />
                </>
            )}
            <CCDrawer
                open={openInquiry}
                onClose={() => {
                    setOpenInquiry(false)
                }}
            >
                <Box display="flex" width="100%" gap={1} padding={1} flexDirection="column">
                    <Typography variant="h2">照会</Typography>
                    <Divider />
                    <Box display="flex" width="100%" gap={1} padding={1}>
                        <TextField
                            label="照会"
                            variant="outlined"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value)
                            }}
                            sx={{
                                flexGrow: 1
                            }}
                        />
                        <Button
                            onClick={() => {
                                inquery(url)
                            }}
                        >
                            照会
                        </Button>
                    </Box>
                </Box>
            </CCDrawer>
            <CCDrawer
                open={openMigration}
                onClose={() => {
                    setOpenMigration(false)
                }}
            >
                <Box display="flex" width="100%" gap={1} padding={1} flexDirection="column">
                    <Typography variant="h2">引っ越しオプション</Typography>
                    <Divider />
                    <Box display="flex" width="100%" gap={1} padding={1}>
                        <TextField
                            label="引っ越し元を追加"
                            variant="outlined"
                            value={newAlias}
                            onChange={(e) => {
                                setNewAlias(e.target.value)
                            }}
                            sx={{
                                flexGrow: 1
                            }}
                        />
                        <Button
                            onClick={() => {
                                client.api
                                    .fetchWithCredential(
                                        client.api.host,
                                        `/ap/api/resolve/${encodeURIComponent(newAlias)}`,
                                        {
                                            method: 'GET',
                                            headers: {
                                                accept: 'application/ld+json'
                                            }
                                        }
                                    )
                                    .then(async (res) => await res.json())
                                    .then((data) => {
                                        if (data.content.id) {
                                            const newAliases = [...new Set([...aliases, data.content.id])]

                                            client.api
                                                .fetchWithCredential(client.api.host, `/ap/api/entities/aliases`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'content-type': 'application/json'
                                                    },
                                                    body: JSON.stringify({
                                                        aliases: newAliases
                                                    })
                                                })
                                                .then(async (res) => await res.json())
                                                .then((data) => {
                                                    console.log(data)
                                                    enqueueSnackbar('更新しました', {
                                                        variant: 'success'
                                                    })
                                                    setAliases(newAliases)
                                                })
                                        }
                                    })
                            }}
                        >
                            追加
                        </Button>
                    </Box>
                    <Box
                        display="flex"
                        flexDirection="column"
                        gap={1}
                        sx={{
                            flexGrow: 1
                        }}
                    >
                        {aliases.map((alias) => (
                            <>
                                <Typography>{alias}</Typography>
                                <APUserCard
                                    url={alias}
                                    remove={(body) => {
                                        const newAliases = aliases.filter((a) => a !== body.URL)
                                        client.api
                                            .fetchWithCredential(client.api.host, `/ap/api/entities/aliases`, {
                                                method: 'POST',
                                                headers: {
                                                    'content-type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                    aliases: newAliases
                                                })
                                            })
                                            .then(async (res) => await res.json())
                                            .then((data) => {
                                                console.log(data)
                                                enqueueSnackbar('更新しました', {
                                                    variant: 'success'
                                                })
                                                setAliases(newAliases)
                                            })
                                    }}
                                />
                            </>
                        ))}
                    </Box>
                </Box>
            </CCDrawer>
        </Box>
    )
}
