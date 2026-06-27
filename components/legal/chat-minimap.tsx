"use client"

import React, { useEffect, useState, useRef, useMemo } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatMinimapProps {
  messages: Message[]
}

export function ChatMinimap({ messages }: ChatMinimapProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoveredText, setHoveredText] = useState("")
  const [hoveredY, setHoveredY] = useState(0)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollStats, setScrollStats] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  })

  // Filter messages to only show user prompts
  const userMessages = useMemo(() => {
    return messages.filter((m) => m.role === "user")
  }, [messages])

  // Calculate line width based on prompt content length
  const getLineWidth = (content: string) => {
    const len = content.length
    if (len < 20) return 10
    if (len < 60) return 18
    if (len < 150) return 26
    return 36
  }

  // Handle line item click (smooth scroll chat window to that message)
  const handleLineClick = (id: string) => {
    setActiveId(id)
    const element = document.getElementById(`chat-msg-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  // Scroll minimap lines container
  const scrollMinimap = (direction: "up" | "down") => {
    const container = scrollContainerRef.current
    if (!container) return

    const offset = direction === "up" ? -80 : 80
    container.scrollBy({ top: offset, behavior: "smooth" })
  }

  // Update scrolling state/stats
  const updateScrollStats = () => {
    const container = scrollContainerRef.current
    if (!container) return
    setScrollStats({
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
    })
  }

  useEffect(() => {
    updateScrollStats()
  }, [userMessages])

  // Observe which user message is currently visible in the chat viewport
  useEffect(() => {
    // Attempt to locate radix scroll area viewport
    const radixViewport = document.querySelector("[data-radix-scroll-area-viewport]")
    
    const observerOptions = {
      root: radixViewport || null,
      rootMargin: "-25% 0px -25% 0px", // Trigger when comfortably centered
      threshold: 0,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace("chat-msg-", "")
          setActiveId(id)
        }
      })
    }, observerOptions)

    // Observe each user message
    userMessages.forEach((msg) => {
      const el = document.getElementById(`chat-msg-${msg.id}`)
      if (el) {
        observer.observe(el)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [userMessages])

  // Tooltip layout configurations
  const showUpArrow = scrollStats.scrollTop > 1
  const showDownArrow = scrollStats.scrollHeight - scrollStats.scrollTop - scrollStats.clientHeight > 1

  if (userMessages.length === 0) {
    return null
  }

  return (
    <div 
      className="fixed right-[20px] top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center pointer-events-none select-none"
      style={{ right: "24px" }}
    >
      {/* Tooltip Overlay */}
      {hoveredId && hoveredText && (
        <div
          className="absolute left-[-260px] w-[240px] rounded-lg bg-black/85 text-white text-[11px] leading-relaxed p-2.5 shadow-md transition-opacity duration-150 pointer-events-none font-sans z-50"
          style={{ 
            top: `${hoveredY - 14}px`,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          <div className="line-clamp-3 text-white/90">
            {hoveredText}
          </div>
          {/* Subtle triangle point to the right */}
          <div 
            className="absolute right-[-4px] top-[14px] w-2 h-2 bg-black/85 rotate-45"
            style={{ borderRight: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
      )}

      {/* Main Container without Box */}
      <div 
        className="flex flex-col items-center py-2 px-1 bg-transparent border-0 pointer-events-auto"
        style={{
          width: "56px"
        }}
      >
        {/* Up Scroll Arrow */}
        {showUpArrow ? (
          <button
            onClick={() => scrollMinimap("up")}
            className="flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition p-0.5 mb-1"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
        ) : (
          <div className="h-4 w-3" />
        )}

        {/* Scrollable Minimap Area */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollStats}
          className="max-h-[300px] overflow-y-auto overflow-x-hidden flex flex-col items-center gap-[6px] px-[2px] w-full no-scrollbar scroll-smooth"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {userMessages.map((msg, index) => {
            const isActive = activeId === msg.id
            const isHovered = hoveredId === msg.id
            const width = getLineWidth(msg.content)
            
            // Emphasize: active is thickest and widest; hovered is slightly thicker/wider
            const heightClass = isActive ? "h-[3.5px]" : isHovered ? "h-[2.5px]" : "h-[1.5px]"
            const finalWidth = width * (isActive ? 1.6 : isHovered ? 1.3 : 1)

            return (
              <button
                key={msg.id}
                onClick={() => handleLineClick(msg.id)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const containerRect = e.currentTarget.parentElement?.getBoundingClientRect()
                  const relativeY = rect.top - (containerRect?.top || 0)
                  setHoveredId(msg.id)
                  setHoveredText(msg.content.length > 60 ? `${msg.content.slice(0, 60)}...` : msg.content)
                  setHoveredY(relativeY)
                }}
                onMouseLeave={() => {
                  setHoveredId(null)
                  setHoveredText("")
                }}
                className="group flex h-[6px] items-center justify-center w-full focus:outline-none"
              >
                <div
                  className={`rounded-full transition-all duration-200 ${heightClass}`}
                  style={{
                    width: `${finalWidth}px`,
                    backgroundColor: isActive 
                      ? "rgba(15, 23, 42, 0.95)" 
                      : isHovered 
                        ? "rgba(15, 23, 42, 0.65)" 
                        : "rgba(15, 23, 42, 0.25)",
                    boxShadow: isActive ? "0 0 6px rgba(15, 23, 42, 0.2)" : "none"
                  }}
                />
              </button>
            )
          })}
        </div>

        {/* Down Scroll Arrow */}
        {showDownArrow ? (
          <button
            onClick={() => scrollMinimap("down")}
            className="flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition p-0.5 mt-1"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        ) : (
          <div className="h-4 w-3" />
        )}
      </div>
    </div>
  )
}
