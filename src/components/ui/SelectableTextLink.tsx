import { NavigateFunction, useNavigate } from 'react-router-dom'

export interface SelectableTextLinkProps {
    link: string
    children?: JSX.Element | Array<JSX.Element | undefined>
}

export const SelectableTextLink = (props: SelectableTextLinkProps): JSX.Element => {
    const navigate = useNavigate()
    return (
        <>
            <div
                style={{ cursor: 'pointer' }}
                onClick={(event: any) => {
                    console.log(event.target)
                    const selectedString = window.getSelection()?.toString()
                    if (selectedString !== '') return
                    navigate(props.link)
                }}
            >
                {props.children}
            </div>
        </>
    )
}
