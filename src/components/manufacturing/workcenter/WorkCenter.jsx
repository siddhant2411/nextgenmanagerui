import React from 'react'
import { Route, Routes } from 'react-router-dom'
import AddWorkCenter from './AddWorkCenter'

export default function WorkCenter() {
  return (
   <>
   <Routes>
        <Route element={<AddWorkCenter />} path='/'>

        </Route>
   </Routes>
   </>


    
  )

}
