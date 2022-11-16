import React, { createContext, useContext, useRef , useEffect, useReducer, useCallback} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Component } from 'react';
import { useState } from 'react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);