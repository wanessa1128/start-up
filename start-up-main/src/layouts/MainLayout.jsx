import { Outlet, useLocation, useNavigate } from "react-router-dom"

import Navbar from "../components/Navbar/Navbar"
import Sidebar from "../components/Sidebar/Sidebar"

import "./MainLayout.css"

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  function handleSearch(value) {
    const search = value
      ? `?${new URLSearchParams({ search: value }).toString()}`
      : ""

    navigate({
      pathname: "/explore",
      search
    })
  }

  function handleNavigate(page) {
    const routes = {
      home: "/",
      explore: "/explore",
      startups: "/startups",
      communities: "/communities",
      messages: "/messages",
      dashboard: "/dashboard",
      "create-startup": "/create-startup",
      configuration: "/configuration"
    }

    const route = routes[page]

    if (route) {
      navigate(route)
    }
  }

  function getActivePage() {
    const path = location.pathname

    if (path === "/") {
      return "home"
    }

    if (path.startsWith("/explore")) {
      return "explore"
    }

    if (path.startsWith("/startups")) {
      return "startups"
    }

    if (path.startsWith("/communities")) {
      return "communities"
    }

    if (path.startsWith("/messages")) {
      return "messages"
    }

    if (path.startsWith("/dashboard")) {
      return "dashboard"
    }

    if (path.startsWith("/create-startup")) {
      return "create-startup"
    }

    if (path.startsWith("/configuration")) {
      return "configuration"
    }

    return "home"
  }

  return (
    <div className="main-layout">

      <Navbar onSearch={handleSearch} />

      <div className="main-layout-body">

        <Sidebar
          activePage={getActivePage()}
          onNavigate={handleNavigate}
        />

        <main className="main-layout-content">
          <Outlet />
        </main>

      </div>

    </div>
  )
}

export default MainLayout