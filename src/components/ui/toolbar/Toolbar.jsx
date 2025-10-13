import React from 'react'
import './toolbar.css'
import AppBreadcrumbs from '../breadcrumb/AppBreadcrumbs'
import Searchbar from './searchbar/Searchbar'
import Notification from './notification/Notification'
import UserMenu from './userinfo/UserMenu'




export default function Toolbar() {
    return (
        <div className='toolbar' >


            <div className='toolbar-left'>


                <AppBreadcrumbs />
            </div>

            <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: "16px" , justifyContent: "flex-end",paddingRight:"20px"}}>
                {/* Searchbar takes remaining space */}

                <Searchbar />


                {/* Notification and UserMenu take only as much space as they need */}
                <Notification />
                <UserMenu />
            </div>


        </div >
    )
}
