import React from 'react'
import pageData from './pageData'
import config from './config'
import components from './components'
import templateData from './templateData'
import { useNavigate, Route, Routes } from "react-router-dom";

console.log(pageData, config, templateData)
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

    const maketree = pool => pool.map(item => {
        if (Array.isArray(item.children) === true) {
            return (
                    <details>
                <summary>
                    {item.name}
                </summary>
                        {maketree(item.children)}
                        </details>
            )
        } 

        return (<p onClick={() => navigate(`/${item.path}`)}>{item.name}</p>)
    })

    return (
        <div class="container-fluid">
                <div class="row">
                    <div class="col-3" style={{height:'100vh', background:'#202124', overflow:'auto', color:'white'}}>
                        <h1 style={{textAlign:'center'}}><a onClick={() => navigate('/')} style={{color:'inherit', textDecoration:'none'}}>{templateData.title}</a></h1>
                        <div style={{textAlign:'center'}}><small>{templateData.version}</small></div>
                        {maketree(templateData.tree)}
                    </div>
                    <div class="col-9" style={{height:'100vh', overflow:'auto'}}>
                        <Routes>
                        {pageData.map(page => (
                                <Route 
                                key={page.path} 
                                index={page.path === `/${config.index}`}
                                 path={page.path === `/${config.index}` ? '/' : page.path.toLowerCase()}
                                element={<div dangerouslySetInnerHTML={{__html: page.content}} onClick={onClick} />} 
                                />
                        ))}
                        {components.map(component => {
                            const Component = component.name
                            const compoPath = component.path

                            return (
                                <Route 
                                key={compoPath} 
                                path={compoPath.toLowerCase()} 
                                element={<Component />} 
                                />
                            )
                        })}
                        </Routes>
                    </div>
                </div>
            </div>
)
    }

export default App