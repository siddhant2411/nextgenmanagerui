import React from 'react'
import WorkCenter from '../components/manufacturing/workcenter/WorkCenter'
import { Route, Routes } from 'react-router-dom'

export default function ManufacturingPage() {
  return (
    <>
      <Routes>

        <Route element={<WorkCenter />} path='/work-center' />
      </Routes>
    </>
  )
}
