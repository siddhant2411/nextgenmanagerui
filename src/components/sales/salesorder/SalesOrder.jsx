import React from 'react'
import { Route, Routes } from 'react-router-dom'
import AddUpdateSalesOrder from './AddUpdateSalesOrder'

export default function SalesOrder() {
  return (
    

    <Routes>
        <Route path='/add' element={<AddUpdateSalesOrder />}>


        </Route>
    </Routes>
  )
}
