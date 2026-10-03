import type {LocationResolution} from './model';
import {normalize} from './user-analysis';

export const LOCATION_FAILURE='Could not locate this emergency. Please check the city and country name.';
type Place={name:string;latitude:number;longitude:number;country?:string;country_code?:string;admin1?:string;admin2?:string;feature_code?:string};
const aliases:Record<string,string>={usa:'us','united states of america':'us',uk:'gb','great britain':'gb',uae:'ae','south korea':'kr','north korea':'kp'};
function sameCountry(input:string,place:Place){
  const value=normalize(input),code=place.country_code?.toLowerCase();
  if(value===normalize(place.country??'')||value===code||aliases[value]===code&&!!code)return true;
  if(!code)return false;
  try{return normalize(new Intl.DisplayNames(['en'],{type:'region'}).of(code.toUpperCase())??'')===value;}catch{return false;}
}
async function lookup(city:string,qualifiers:string[],strictCountry:boolean,fetcher:typeof fetch):Promise<LocationResolution>{
  try{
    const response=await fetcher(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({name:city,count:'100',language:'en',format:'json'})}`,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Unavailable');
    const body=await response.json() as {results?:Place[]};
    const candidates=(Array.isArray(body.results)?body.results:[]).filter(p=>
      typeof p.name==='string'&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=85&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180&&
      normalize(p.name)===normalize(city)&&(!p.feature_code||p.feature_code.startsWith('PPL'))&&
      (strictCountry?sameCountry(qualifiers[0],p):qualifiers.every(part=>sameCountry(part,p)||[p.admin1,p.admin2].some(v=>v&&normalize(v)===normalize(part))))
    );
    const unique=[...new Map(candidates.map(p=>[`${p.latitude},${p.longitude}`,p])).values()];
    if(unique.length!==1)return {status:unique.length?'ambiguous':'unresolved',message:LOCATION_FAILURE};
    const p=unique[0];
    return {status:'located',coordinates:{latitude:p.latitude,longitude:p.longitude,city:p.name,country:p.country,label:[p.name,p.admin1,p.country].filter(Boolean).join(', '),source:'Open-Meteo / GeoNames',precision:'Locality center'},message:'Approximate city center, not the exact emergency address.'};
  }catch{return {status:'unavailable',message:LOCATION_FAILURE};}
}

/** New submissions require an unambiguous city AND country; no coordinates are entered by the user. */
export async function resolveCityCountry(city:string,country:string,fetcher:typeof fetch=fetch):Promise<LocationResolution>{
  if(!city.trim()||!country.trim()||city.length>100||country.length>100||/^[\d\s.,+-]+$/.test(city))return {status:'unresolved',message:LOCATION_FAILURE};
  return lookup(city.trim(),[country.trim()],true,fetcher);
}

/** Retained for legacy records and existing analysis adapters. */
export async function resolveLocation(input:string,fetcher:typeof fetch=fetch):Promise<LocationResolution>{
  const location=input.trim();
  if(!location||location==='Location not specified')return {status:'missing',message:'Location not specified. No marker placed.'};
  const coordinates=location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(coordinates){const latitude=Number(coordinates[1]),longitude=Number(coordinates[2]);if(Math.abs(latitude)<=85&&Math.abs(longitude)<=180)return {status:'located',coordinates:{latitude,longitude,label:location,source:'User coordinates',precision:'User supplied'},message:'Previously reported coordinates; the incident remains unverified.'};return {status:'unresolved',message:LOCATION_FAILURE};}
  if(/^(?:Village [AB]|Sector \d+)$/i.test(location))return {status:'unresolved',message:LOCATION_FAILURE};
  const [city,...qualifiers]=location.split(',').map(s=>s.trim()).filter(Boolean);
  return lookup(city,qualifiers,false,fetcher);
}
