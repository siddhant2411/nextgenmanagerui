import React from 'react'
import './toolbar.css'
import AppBreadcrumbs from '../breadcrumb/AppBreadcrumbs'
import Searchbar from './searchbar/Searchbar'
import Notification from './notification/Notification'
import UserMenu from './userinfo/UserMenu'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'

export default function Toolbar({ showMenuButton = true, onMenuClick = () => {} }) {
    return (
        <div className='toolbar'>
            <div className='toolbar-left'>
                {showMenuButton && (
                    <IconButton
                        size='small'
                        aria-label='toggle sidebar'
                        onClick={onMenuClick}
                        sx={{ mr: 1 }}
                    >
                        <MenuIcon fontSize='small' />
                    </IconButton>
                )}
                <AppBreadcrumbs />
            </div>

            <div className='toolbar-right' style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end', paddingRight: '20px' }}>
                <Searchbar />
                <Notification />
                <UserMenu />
            </div>
        </div>
    )
}
