import RescueApp from '@/components/rescue/app';
import {notFound,redirect} from 'next/navigation';
const routes=['overview','reports','incidents','missions','resources','command-center'];
const moved:Record<string,string>={home:'/',priority:'/incidents','ai-analysis':'/incidents',verification:'/incidents',prioritization:'/incidents',response:'/missions',activity:'/command-center#timeline',analytics:'/overview',settings:'/overview?settings=1','how-it-works':'/#how-it-works'};
export default async function Page({params}:{params:Promise<{view:string}>}){const{view}=await params;if(moved[view])redirect(moved[view]);if(!routes.includes(view))notFound();return <RescueApp view={view}/>}
