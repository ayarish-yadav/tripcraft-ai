import React from 'react';
import {Link} from 'react-router-dom';
import {CheckCircle2,Clock3,RefreshCw} from 'lucide-react';
import {useBackendStatus} from '../context/BackendStatus';
import {LIVE} from '../services/api';

export function BackendNotice(){
  const {status,error}=useBackendStatus();
  if(!LIVE || (!error && (!status || status.ready)))return null;
  return <div className="backend-notice" role="status"><span>{error?'TripCraft is reconnecting.':!status.features.accounts?'Accounts and AI trip planning are awaiting activation.':'AI trip planning is awaiting activation.'}</span><Link to="/status">View service status →</Link></div>;
}
export default function ServiceStatus(){
  const {status,error,checking,refresh}=useBackendStatus();
  const features=status?.features;
  const rows=[['Website',true],['Weather service',Boolean(features?.weather)&&!error],['Accounts and saved trips',Boolean(features?.accounts)&&!error],['AI itinerary and Smart Replan',Boolean(features?.aiPlanning)&&!error]];
  return <div className="page service-status"><div className="kicker">TRIPCRAFT AVAILABILITY</div><h1>A clear view of <em>what’s ready.</em></h1><p>Check which features are currently available for your next journey.</p><div className="panel status-panel">{rows.map(([name,ready])=><div className="status-row" key={name}><span>{ready?<CheckCircle2 size={20}/>:<Clock3 size={20}/>} {name}</span><b className={ready?'status-ready':'status-pending'}>{ready?'Available':error?'Reconnecting':!status&&LIVE?'Checking…':'Awaiting activation'}</b></div>)}{error&&<p className="error" role="alert">{error}</p>}{!error && status && !status.ready && <p className="mode-note">We’re connecting the services needed for accounts and personalized planning. These features will become available here once activation is complete.</p>}<button className="button" onClick={refresh} disabled={checking||!LIVE}><RefreshCw size={16}/>{checking?'Checking…':'Check again'}</button></div><Link to="/">← Back to discover</Link></div>;
}
