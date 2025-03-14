import {useRef, useState, ReactNode, useEffect} from "react"
import {NDKEvent, NDKFilter} from "@nostr-dev-kit/ndk"

import InfiniteScroll from "@/shared/components/ui/InfiniteScroll"
import useHistoryState from "@/shared/hooks/useHistoryState"
import {useLocalState} from "irisdb-hooks/src/useLocalState"
import FeedItem from "../event/FeedItem/FeedItem"
import {localState} from "irisdb/src"

import {INITIAL_DISPLAY_COUNT, DISPLAY_INCREMENT} from "./utils"
import useFeedEvents from "@/shared/hooks/useFeedEvents.ts"
import {socialGraphLoaded} from "@/utils/socialGraph.ts"
import UnknownUserEvents from "./UnknownUserEvents.tsx"
import {DisplayAsSelector} from "./DisplayAsSelector"
import NewEventsButton from "./NewEventsButton.tsx"
import useMutes from "@/shared/hooks/useMutes.ts"
import MediaFeed from "./MediaFeed"

interface FeedProps {
  filters: NDKFilter
  displayFilterFn?: (event: NDKEvent) => boolean
  fetchFilterFn?: (event: NDKEvent) => boolean
  sortFn?: (a: NDKEvent, b: NDKEvent) => number
  cacheKey?: string
  asReply?: boolean
  showRepliedTo?: boolean
  showReplies?: number
  onEvent?: (event: NDKEvent) => void
  borderTopFirst?: boolean
  emptyPlaceholder?: ReactNode
  forceUpdate?: number
  showEventsByUnknownUsersButton?: boolean
  displayAs?: "list" | "grid"
  showDisplayAsSelector?: boolean
  onDisplayAsChange?: (display: "list" | "grid") => void
  sortLikedPosts?: boolean
}

// TODO fix useLocalState so initial state is properly set from memory, so we can use it instead of this
let myPubKey = ""
localState.get("user/publicKey").on((k) => (myPubKey = k as string))

const DefaultEmptyPlaceholder = (
  <div className="p-8 flex flex-col gap-8 items-center justify-center text-base-content/50">
    No posts yet
  </div>
)

function Feed({
  filters,
  displayFilterFn,
  fetchFilterFn,
  sortFn,
  cacheKey = JSON.stringify(filters),
  asReply = false,
  showRepliedTo = true,
  showReplies = 0,
  onEvent,
  borderTopFirst = true,
  emptyPlaceholder = DefaultEmptyPlaceholder,
  forceUpdate,
  showEventsByUnknownUsersButton = true,
  displayAs: initialDisplayAs = "list",
  showDisplayAsSelector = true,
  onDisplayAsChange,
  sortLikedPosts = false,
}: FeedProps) {
  const [displayCount, setDisplayCount] = useHistoryState(
    INITIAL_DISPLAY_COUNT,
    "displayCount"
  )
  const firstFeedItemRef = useRef<HTMLDivElement>(null)
  const mutes = useMutes()

  const [hideEventsByUnknownUsers] = useLocalState(
    "settings/hideEventsByUnknownUsers",
    true
  )
  const [showEventsByUnknownUsers, setShowEventsByUnknownUsers] = useState(false)

  const [persistedDisplayAs, setPersistedDisplayAs] = useLocalState(
    "user/feedDisplayAs",
    initialDisplayAs
  )

  // Use persisted value only when selector is shown, otherwise use initialDisplayAs
  const displayAs = showDisplayAsSelector ? persistedDisplayAs : initialDisplayAs
  const setDisplayAs = (value: "list" | "grid") => {
    setPersistedDisplayAs(value)
  }

  const [hidePostsByMutedMoreThanFollowed] = useLocalState(
    "settings/hidePostsByMutedMoreThanFollowed",
    true
  )

  const {
    newEvents: newEventsMap,
    newEventsFrom,
    filteredEvents,
    eventsByUnknownUsers,
    showNewEvents,
    loadMoreItems: hookLoadMoreItems,
    initialLoadDone,
  } = useFeedEvents({
    filters,
    cacheKey,
    displayCount,
    displayFilterFn,
    fetchFilterFn,
    sortFn,
    hideEventsByUnknownUsers,
    hidePostsByMutedMoreThanFollowed,
    mutes,
    sortLikedPosts,
  })

  const loadMoreItems = () => {
    const hasMore = hookLoadMoreItems()
    if (hasMore) {
      setDisplayCount((prev: number) => prev + DISPLAY_INCREMENT)
    }
    return hasMore
  }

  const newEventsFiltered = Array.from(newEventsMap.values())

  const [, setForceUpdateCount] = useState(0)

  const [isSocialGraphLoaded, setIsSocialGraphLoaded] = useState(
    filters?.authors?.length === 1
  )

  useEffect(() => {
    if (forceUpdate !== undefined) {
      setForceUpdateCount((prev) => prev + 1)
    }
  }, [forceUpdate])

  useEffect(() => {
    socialGraphLoaded.then(() => setIsSocialGraphLoaded(true))
  }, [])

  if (!isSocialGraphLoaded) {
    return null
  }

  return (
    <>
      {showDisplayAsSelector && (
        <DisplayAsSelector
          activeSelection={displayAs}
          onSelect={(display) => {
            setDisplayAs(display)
            onDisplayAsChange?.(display)
          }}
        />
      )}

      {newEventsFiltered.length > 0 && (
        <NewEventsButton
          newEventsFiltered={newEventsFiltered}
          newEventsFrom={newEventsFrom}
          showNewEvents={showNewEvents}
          firstFeedItemRef={firstFeedItemRef}
        />
      )}

      <div>
        {filteredEvents.length > 0 && (
          <InfiniteScroll onLoadMore={loadMoreItems}>
            {displayAs === "grid" ? (
              <MediaFeed events={filteredEvents} />
            ) : (
              <>
                {filteredEvents.slice(0, displayCount).map((event, index) => (
                  <div key={event.id} ref={index === 0 ? firstFeedItemRef : null}>
                    <FeedItem
                      asReply={asReply}
                      showRepliedTo={showRepliedTo}
                      showReplies={showReplies}
                      event={"content" in event ? event : undefined}
                      eventId={"content" in event ? undefined : event.id}
                      onEvent={onEvent}
                      borderTop={borderTopFirst && index === 0}
                    />
                  </div>
                ))}
              </>
            )}
          </InfiniteScroll>
        )}
        {filteredEvents.length === 0 &&
          newEventsFiltered.length === 0 &&
          initialLoadDone &&
          emptyPlaceholder}
        {showEventsByUnknownUsersButton &&
          myPubKey &&
          eventsByUnknownUsers.length > 0 && (
            <div
              className="p-4 border-t border-b border-custom text-info text-center transition-colors duration-200 ease-in-out hover:underline hover:bg-[var(--note-hover-color)] cursor-pointer"
              onClick={() => setShowEventsByUnknownUsers(!showEventsByUnknownUsers)}
            >
              {showEventsByUnknownUsers ? "Hide" : "Show"} {eventsByUnknownUsers.length}{" "}
              events by unknown users
            </div>
          )}
        {showEventsByUnknownUsers && eventsByUnknownUsers.length > 0 && (
          <UnknownUserEvents
            eventsByUnknownUsers={eventsByUnknownUsers}
            showRepliedTo={showRepliedTo}
            asReply={true}
          />
        )}
      </div>
    </>
  )
}

export default Feed
