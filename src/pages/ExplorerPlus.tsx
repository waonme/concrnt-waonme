import { Helmet } from 'react-helmet-async'
import {
    Avatar,
    Box,
    Button,
    Card,
    CardActions,
    CardMedia,
    Collapse,
    Divider,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StreamCard } from '../components/Stream/Card'
import { CCWallpaper } from '../components/ui/CCWallpaper'
import { WatchButton } from '../components/WatchButton'
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import FindInPageIcon from '@mui/icons-material/FindInPage'
import { CCIconButton } from '../components/ui/CCIconButton'

export interface Domain {
    fqdn: string
    ccid: string
    csid: string
    tag: string
    score: number
    meta?: DomainMeta
    isScoreFixed: boolean
    dimension: string
    cdate: string
    mdate: string
    lastScraped: string
}

export interface DomainMeta {
    nickname: string
    description: string
    logo: string
    wordmark: string
    themeColor: string
    maintainerName: string
    maintainerEmail: string
    registration: string
    version: string
    buildInfo: {
        BuildTime: string
        BuildMachine: string
        GoVersion: string
    }
    captchaSiteKey: string
    vapidKey: string
}

export interface Timeline {
    id: string
    indexable: boolean
    owner: string
    author: string
    schema: string
    policy: string
    policyParams: string
    document?: string
    _parsedDocument: {
        id: string
        owner: string
        signer: string
        type: string
        schema: string
        body: {
            name: string
            shortname: string
            description: string
            banner: string
        }
        meta: {
            client: string
        }
        signAt: string
        indexable: boolean
        policy: string
        keyID: string
    }
    signature: string
    cdate: string
    mdate: string
    domainFQDN?: string
}

export function ExplorerPlusPage(): JSX.Element {
    const { t } = useTranslation('', { keyPrefix: 'pages.explore' })
    const theme = useTheme()

    const [timelines, setTimelines] = useState<Timeline[]>([])
    const [domains, setDomains] = useState<Domain[]>([])

    const [query, setQuery] = useState('')

    const [textArea, setTextArea] = useState('')

    useEffect(() => {
        // fetch
        if (query === '') {
            fetch('https://c.kokopi.me/timeline?random=true&limit=30').then(async (result) => {
                setTimelines(await result.json())
            })
        } else {
            fetch('https://c.kokopi.me/timeline?q=' + query).then(async (result) => {
                setTimelines(await result.json())
            })
        }

        fetch('https://c.kokopi.me/domain').then(async (result) => {
            setDomains(await result.json())
        })
    }, [query])

    const getDomainFromFQDN = useCallback(
        (fqdn: string | undefined) => {
            return domains.filter((d) => d.fqdn === fqdn)[0]
        },
        [domains]
    )

    return (
        <>
            <Helmet>
                <title>ExplorerPlus - Concrnt</title>
            </Helmet>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    paddingX: 1,
                    paddingTop: 1,
                    background: theme.palette.background.paper,
                    minHeight: '100%',
                    overflowY: 'scroll'
                }}
            >
                <Box>
                    <Typography variant="h2">{t('title')}</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <TextField
                        value={textArea}
                        onChange={(e) => {
                            setTextArea(e.target.value)
                            setQuery(e.target.value)
                        }}
                    />

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(384px, 1fr))',
                            gap: 1
                        }}
                    >
                        {timelines.map((t) => {
                            return (
                                <Card key={t.id} sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                                    <CardMedia sx={{ height: '100px', width: '100px' }}>
                                        <CCWallpaper
                                            sx={{
                                                height: '100px',
                                                width: '100px'
                                            }}
                                            override={t._parsedDocument.body.banner}
                                        />
                                    </CardMedia>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            paddingY: 0.3,
                                            paddingX: 0.5,
                                            height: '100%',
                                            flex: 1,
                                            minWidth: 0
                                        }}
                                    >
                                        <Box flexGrow={1}>
                                            <Typography variant={'body1'}>#{t._parsedDocument.body.name}</Typography>
                                            <Typography
                                                variant={'caption'}
                                                sx={{
                                                    textOverflow: 'ellipsis',
                                                    overflow: 'hidden',
                                                    display: 'black',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {t._parsedDocument.body.description}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', marginTop: 'auto' }}>
                                            <Avatar
                                                src={getDomainFromFQDN(t.domainFQDN)?.meta?.logo}
                                                sx={{ height: 18, width: 18 }}
                                            />
                                            <Typography variant="caption">
                                                {getDomainFromFQDN(t.domainFQDN)?.meta?.nickname}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
                                                <WatchButton minimal small timelineID={t.id} />
                                                <Tooltip title={'みてみる'} placement={'top'} arrow>
                                                    <CCIconButton size={'small'}>
                                                        <FindInPageIcon />
                                                    </CCIconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Card>
                            )
                        })}
                    </Box>
                </Box>
            </Box>
        </>
    )
}
