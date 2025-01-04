import { type SxProps, Link } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export interface CCLinkProps {
    sx?: SxProps
    href: string
    children?: JSX.Element | string
}

export const CCLink = (props: CCLinkProps): JSX.Element => {
    const isInternal = props.href.startsWith('/') || props.href.startsWith('https://concrnt.world')

    if (isInternal) {
        return (
            <Link
                component={RouterLink}
                sx={props.sx}
                to={props.href}
                onClick={(e) => {
                    e.stopPropagation()
                }}
            >
                {props.children}
            </Link>
        )
    } else {
        return (
            <Link
                sx={props.sx}
                href={props.href}
                onClick={(e) => {
                    e.stopPropagation()
                }}
            >
                {props.children}
            </Link>
        )
    }
}
