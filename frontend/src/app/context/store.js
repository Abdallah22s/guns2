 'use client'

 import { createContext,useContext,Dispatch,SetStateAction,useState } from "react"

 const GlobalContext=createContext({
    state:[],
    setState:()=>[],
    alerts:[],
    setAlerts:()=>[],
    isRTL:false,
    setIsRTL:()=>false
    
 })

 export const GlobalContextProvider=({children})=>{
    const [state,setState]=useState(
        {
            cameras:[],
            selectedCamera:{},
        }
    )
    const [alerts,setAlerts]=useState([])
    const [isRTL,setIsRTL]=useState(false)
    return(
        <GlobalContext.Provider value={{state,setState,alerts,setAlerts,isRTL,setIsRTL}}>
            {children}
        </GlobalContext.Provider>
    )
 }

 export const useGlobalContext=()=>useContext(GlobalContext);