import React from 'react';
import {useState,useEffect} from 'react';
import {Routes,Route,Link,NavLink,useNavigate,useParams} from 'react-router-dom';
import {Sparkles,ArrowUpRight,ArrowRight,MapPin,CalendarDays,Wallet,Users,Compass,Heart,Mountain,Utensils,Camera,Leaf,Menu,X,Plus,Check,CloudSun,Download,RefreshCw,Send,Map,Hotel,Train,Trash2,ChevronRight,LogOut} from 'lucide-react';
import api,{LIVE} from '../services/api';import {destinations,sampleTrip,demoReplan} from '../services/planner';import {useAuth} from '../context/AuthContext';
const money=n=>'₹'+Math.round(n).toLocaleString('en-IN');
function Profile({trips}){const {user}=useAuth();return <div className="page"><div className="panel profile"><Compass size={40}/><h1>{user?.name||'Your travel profile'}</h1><p>{user?.email||'Sign in once the backend is connected to manage your account.'}</p><h2>{trips.length} saved journeys</h2><Link className="button" to={user?'/trips':'/login'}>{user?'View my trips':'Log in'}<ArrowRight size={17}/></Link></div></div>}

export default Profile;
