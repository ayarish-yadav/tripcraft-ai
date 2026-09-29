import React from 'react';
import {useState,useEffect} from 'react';
import {Routes,Route,Link,NavLink,useNavigate,useParams} from 'react-router-dom';
import {Sparkles,ArrowUpRight,ArrowRight,MapPin,CalendarDays,Wallet,Users,Compass,Heart,Mountain,Utensils,Camera,Leaf,Menu,X,Plus,Check,CloudSun,Download,RefreshCw,Send,Map,Hotel,Train,Trash2,ChevronRight,LogOut} from 'lucide-react';
import api,{LIVE} from '../services/api';import {destinations,sampleTrip,demoReplan} from '../services/planner';import {useAuth} from '../context/AuthContext';
const money=n=>'₹'+Math.round(n).toLocaleString('en-IN');
function Saved({trips,remove}){return <div className="page"><div className="section-heading"><div><div className="kicker">YOUR LITTLE COLLECTION OF ADVENTURES</div><h1>Journeys worth <em>keeping.</em></h1><p>{LIVE?'Your saved journeys, ready when you are.':'Demo trips are saved in this browser.'}</p></div><Link to="/plan" className="button"><Plus size={18}/> New trip</Link></div>{trips.length?<div className="saved-grid">{trips.map(t=><article className="saved-card" key={t.id}><Link to={`/trip/${t.id}`}><img src={t.image||'/images/dolomites.jpg'} alt={t.destination}/><div><small>{t.days} DAYS · {t.travelers} TRAVELERS</small><h2>{t.destination}</h2><p>{t.date} <span>· {money(t.budget)}</span></p></div></Link><button className="delete-button" title="Delete trip" onClick={()=>{if(confirm(`Delete your ${t.destination} trip?`))remove(t.id)}}><Trash2 size={18}/></button></article>)}</div>:<div className="empty panel"><Heart size={36}/><h2>Your next story belongs here.</h2><p>Craft a trip and save it to start your collection.</p><Link to="/plan" className="button">Find your next adventure <ArrowRight size={18}/></Link></div>}</div>}

export default Saved;
