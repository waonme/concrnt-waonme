import { Helmet } from 'react-helmet-async'
import {
    Avatar,
    Box,
    Button,
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
    Typography,
    useTheme
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StreamCard } from '../components/Stream/Card'

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
        (fqdn: string) => {
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
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: 2
                        }}
                    >
                        {timelines.map((t) => {
                            return (
                                <StreamCard
                                    key={t.id}
                                    streamID={t.id}
                                    name={t._parsedDocument.body.name}
                                    description={t._parsedDocument.body.description}
                                    banner={t._parsedDocument.body.banner}
                                    domain={t.domainFQDN ?? ''}
                                />
                            )
                        })}
                    </Box>
                </Box>
            </Box>
        </>
    )
}

function Row(props: { timeline: Timeline; domain: Domain }): JSX.Element {
    const { timeline, domain } = props
    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell component="th" scope="row" colSpan={1}>
                    <Typography>#{timeline._parsedDocument.body.name}</Typography>
                </TableCell>
                <TableCell colSpan={3}>
                    <Typography variant={'caption'}>{timeline._parsedDocument.body.description}</Typography>
                </TableCell>
                <TableCell colSpan={1}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Avatar src={domain?.meta?.logo} sx={{ height: 24, width: 24 }} />
                        <Typography variant="caption">{domain?.meta?.nickname}</Typography>
                    </Box>
                </TableCell>
                <TableCell colSpan={1}>
                    <Button size={'small'}>見てみる</Button>
                </TableCell>
            </TableRow>
            {/* <TableRow> */}
            {/*    <TableCell style={{ paddingBottom: 0, paddingTop: 0, paddingLeft: '80px' }} colSpan={6}> */}
            {/*        <Collapse in={open} timeout="auto" unmountOnExit> */}
            {/*            <Box sx={{ margin: 1 }}> */}
            {/*                <Table size="small" aria-label="purchases"> */}
            {/*                    <TableBody> */}
            {/*                        {domain.timelines.map((timeline) => ( */}
            {/*                            <TableRow key={timeline.id}> */}
            {/*                                <TableCell component="th" scope="row"> */}
            {/*                                    {timeline._parsedDocument.body.name} */}
            {/*                                </TableCell> */}
            {/*                                <TableCell>{timeline._parsedDocument.body.description}</TableCell> */}
            {/*                            </TableRow> */}
            {/*                        ))} */}
            {/*                    </TableBody> */}
            {/*                </Table> */}
            {/*            </Box> */}
            {/*        </Collapse> */}
            {/*    </TableCell> */}
            {/* </TableRow> */}
        </>
    )
}
