import React from 'react'
import { routerBase } from '../config/config'

export const FooterLogo = ({type}) => {
    if (type == "light")
        return (
            <div className='py-8 flex justify-center'>
                <div className='text-center'>
                    <span className='text-lg font-bold text-gray-700'></span>
                </div>
            </div>
        )
    else
        return (
            <div className='py-8 flex justify-center'>
                <div className='text-center'>
                    <span className='text-lg font-bold text-white'></span>
                </div>
            </div>
        )
}
