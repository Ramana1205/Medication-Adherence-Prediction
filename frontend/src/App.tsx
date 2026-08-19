// Import React library to use JSX and React components
import React from 'react';
// Import routing components from react-router-dom to handle page navigation without reloading the browser
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// -- LAYOUT IMPORTS --
// Import the DoctorLayout which wraps all doctor pages with a common sidebar/header
import { DoctorLayout } from './components/layout/DoctorLayout';
// Import the PatientDashboard (Patients don't have a complex layout wrapper yet, just a single page)
import { PatientDashboard } from './pages/PatientDashboard';

// -- DOCTOR PAGE IMPORTS --
// Import the main analytics dashboard for the doctor
import { DoctorDashboard } from './pages/DoctorDashboard';
// Import the list view showing all patients
import { PatientsList } from './pages/PatientsList';
// Import the detailed view for a single specific patient
import { PatientDetail } from './pages/PatientDetail';
// Additional doctor pages
import { Medications } from './pages/Medications';
import { RiskAlerts } from './pages/RiskAlerts';
import { Interventions } from './pages/Interventions';
import { Profile } from './pages/Profile';
import { DeveloperView } from './pages/DeveloperView';
import { DoctorMessages } from './pages/DoctorMessages';
// Patient chat
import { PatientChat } from './pages/PatientChat';
import { PatientProfile } from './pages/PatientProfile';

// -- SHARED & PATIENT AUTH IMPORTS --
// Import the main landing/login screen where users choose Doctor vs Patient
import { Login } from './pages/Login';
import { DoctorLogin } from './pages/DoctorLogin';
// Import the Patient Portal selection screen (Existing vs New Patient)
import { PatientAuthLanding } from './pages/PatientAuthLanding';
// Import the login screen for existing patients
import { PatientLogin } from './pages/PatientLogin';
// Import the 3-step registration wizard for new patients
import { PatientRegistration } from './pages/PatientRegistration';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Define the main App component using TypeScript functional component (React.FC) syntax
const App: React.FC = () => {
  // Return the JSX structure for the application
  return (
    // Wrap the entire application in the Router component to enable URL-based routing
    <Router>
      {/* Routes acts as a switch, rendering only the first Route that matches the current URL */}
      <Routes>
        
        {/* The root path ("/") renders the main Login landing page */}
        <Route path="/" element={<Login />} />
        
        {/* DOCTOR ROUTES GROUP */}
        {/* All paths starting with "/doctor" will be wrapped inside the DoctorLayout component */}
        <Route path="/doctor" element={<ProtectedRoute role="DOCTOR" />}>
          <Route element={<DoctorLayout />}>
          
          {/* If the user navigates to exactly "/doctor", automatically redirect them to "/doctor/dashboard" */}
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          
          {/* Render the DoctorDashboard when URL is "/doctor/dashboard" */}
          <Route path="dashboard" element={<DoctorDashboard />} />
          
          {/* Render the PatientsList when URL is "/doctor/patients" */}
          <Route path="patients" element={<PatientsList />} />

          <Route path="medications" element={<Medications />} />
          <Route path="risk-alerts" element={<RiskAlerts />} />
          <Route path="interventions" element={<Interventions />} />
          <Route path="messages" element={<DoctorMessages />} />
          <Route path="profile" element={<Profile />} />
          <Route path="dev" element={<DeveloperView />} />
          
          {/* Render the PatientDetail page for a specific ID (e.g., "/doctor/patient/P0001") */}
          <Route path="patient/:id" element={<PatientDetail />} />
        
          </Route>
        </Route>

        {/* Doctor Login page (public) */}
        <Route path="/doctor/login" element={<DoctorLogin />} />

        {/* PATIENT ROUTES GROUP */}
        {/* Route for the Patient Portal selection screen (Existing vs New) */}
        <Route path="/patient/auth" element={<PatientAuthLanding />} />
        
        {/* Route for the existing patient login form */}
        <Route path="/patient/login" element={<PatientLogin />} />
        
        {/* Route for the new patient 3-step registration wizard */}
        <Route path="/patient/register" element={<PatientRegistration />} />
        
        {/* Route for the main patient adherence tracking dashboard */}
        <Route path="/patient" element={<ProtectedRoute role="PATIENT" />}>
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="chat" element={<PatientChat />} />
          <Route path="profile" element={<PatientProfile />} />
        </Route>

        {/* FALLBACK ROUTE */}
        {/* If the user types a URL that doesn't match anything above (the "*" wildcard), redirect them back to the root "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      
      </Routes>
    </Router>
  );
};

// Export the App component so it can be imported and rendered in main.tsx
export default App;
