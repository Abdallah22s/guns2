"use client"
import {useRouter} from 'next/navigation'
import { useEffect } from 'react';
import { routerBase } from './config/config';

function HomePage() {
  const router = useRouter();
  
  useEffect(()=>{
    router.push(`${routerBase}dashboard`);
  },[])
  
  return null;
}

export default HomePage;





