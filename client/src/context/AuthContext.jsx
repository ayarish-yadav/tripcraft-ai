import React from 'react';
import {createContext,useContext,useState} from 'react';
import api from '../services/api';
const AuthContext=createContext();
export function AuthProvider({children}){const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('tripcraft_user'))}catch{return null}});async function authenticate(mode,values){const {data}=await api.post(`/auth/${mode}`,values);localStorage.setItem('tripcraft_token',data.token);localStorage.setItem('tripcraft_user',JSON.stringify(data.user));setUser(data.user);}function logout(){localStorage.removeItem('tripcraft_token');localStorage.removeItem('tripcraft_user');setUser(null);}return <AuthContext.Provider value={{user,authenticate,logout}}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
