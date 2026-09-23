import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import ReportPage from './pages/Report/ReportPage';
import PrintReportPage from './pages/Report/PrintReportPage';
import RawDataPage from './pages/RawData/RawDataPage';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ReportPage />} />
        <Route path="raw-data" element={<RawDataPage key="pei" />} />
      </Route>
      <Route path="print-report" element={<PrintReportPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
