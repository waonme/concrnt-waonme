import { Helmet } from 'react-helmet-async'
import {
    Avatar,
    Box,
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

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

// document

export interface Timeline {
    id: string
    indexable: boolean
    owner: string
    author: string
    schema: string
    policy: string
    policyParams: string
    document: string
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
}

export interface DomainCache {
    domain: Domain
    timelines: Timeline[]
}

export function ExplorerPlusPage(): JSX.Element {
    const { t } = useTranslation('', { keyPrefix: 'pages.explore' })
    const theme = useTheme()

    const [domains, setDomains] = useState<DomainCache[]>([])
    const [query, setQuery] = useState('')

    const [textArea, setTextArea] = useState('')

    useEffect(() => {
        // fetch
        fetch('https://c.kokopi.me/cache?q=' + query).then(async (result) => {
            setDomains(await result.json())
        })
    }, [query])

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
                    <h3>{domains.length}</h3>

                    <TextField
                        value={textArea}
                        onChange={(e) => {
                            setTextArea(e.target.value)
                            setQuery(e.target.value)
                        }}
                    ></TextField>
                </Box>
                <TableContainer component={Paper}>
                    <Table aria-label="collapsible table">
                        <TableHead>
                            <TableRow>
                                <TableCell width={10} />
                                <TableCell>NickName</TableCell>
                                <TableCell>FQDN</TableCell>
                                <TableCell align="right">Count Of Stream</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {domains.map((row) => (
                                <Row key={row.domain.fqdn} domain={row} />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </>
    )
}

function Row(props: { domain: DomainCache }): JSX.Element {
    const [open, setOpen] = useState(true)
    const { domain } = props
    console.log(props)
    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => {
                            setOpen(!open)
                        }}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Avatar alt={domain.domain.meta?.nickname} src={domain.domain.meta?.logo} />
                        <Typography>{domain.domain.meta?.nickname}</Typography>
                    </Box>
                </TableCell>
                <TableCell>{domain.domain.fqdn}</TableCell>
                <TableCell align="right">{domain.timelines.length}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, paddingLeft: '80px' }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Table size="small" aria-label="purchases">
                                <TableBody>
                                    {domain.timelines.map((timeline) => (
                                        <TableRow key={timeline.id}>
                                            <TableCell component="th" scope="row">
                                                {timeline._parsedDocument.body.name}
                                            </TableCell>
                                            <TableCell>{timeline._parsedDocument.body.description}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    )
}
