import React from 'react';
import {Link} from 'react-router-dom';
export default function Brand({footer=false}) {
 return <Link className={`brand brand-logo${footer?' brand-footer':''}`} to="/" aria-label="TripCraft home"><img src="/images/tripcraft-logo.png" alt="TripCraft — van, palms and a golden sun" width="180" height="120"/></Link>;
}
