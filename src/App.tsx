import React from 'react';
import { ToastContainer } from 'react-toastify';
import { Home } from '@/pages/Home';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <Home />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        className="!z-[9999]"
      />
    </>
  );
}

export default App;
