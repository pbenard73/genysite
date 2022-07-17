import React from 'react'
import pageData from './pageData'
import config from './config'
import templateData from './templateData'
import { useNavigate, Route, Routes } from "react-router-dom";

console.log(pageData, config)
const App = () => {
    const navigate = useNavigate()

    const onClick = e => {
        if (e.target.closest('a[href]') === null) {
            return
        }

        const href = e.target.closest('a[href]').getAttribute('href')
        if ( href.slice(0, 1) === "/") {
            e.preventDefault()
            navigate(href === `/${config.index}` ? '/' : href)
            return false;
        }
    }

    return (
    <Routes>
        {pageData.map(page => (
            <Route 
            key={page.path} 
            index={page.path === `/${config.index}`} path={page.path === `/${config.index}` ? '/' : page.path}
             element={<div dangerouslySetInnerHTML={{__html: page.content}} onClick={onClick} />} 
             />
        ))}
      </Routes>
)
    }

export default App