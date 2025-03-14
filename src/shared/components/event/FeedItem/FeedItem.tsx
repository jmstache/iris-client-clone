import {eventsByIdCache, addSeenEventId} from "@/utils/memcache.ts"
import {useEffect, useMemo, useState, useRef} from "react"
import {NDKEvent} from "@nostr-dev-kit/ndk"
import classNames from "classnames"

import {getEventReplyingTo, fetchEvent, getEventRoot, isRepost} from "@/utils/nostr.ts"
import {getEventIdHex, handleEventContent} from "@/shared/components/event/utils.ts"
import RepostHeader from "@/shared/components/event/RepostHeader.tsx"
import FeedItemActions from "../reactions/FeedItemActions.tsx"
import FeedItemPlaceholder from "./FeedItemPlaceholder.tsx"
import ErrorBoundary from "../../ui/ErrorBoundary.tsx"
import Feed from "@/shared/components/feed/Feed.tsx"
import FeedItemContent from "./FeedItemContent.tsx"
import {onClick, TRUNCATE_LENGTH} from "./utils.ts"
import FeedItemHeader from "./FeedItemHeader.tsx"
import socialGraph from "@/utils/socialGraph.ts"
import FeedItemTitle from "./FeedItemTitle.tsx"
import {Link, useNavigate} from "react-router"
import LikeHeader from "../LikeHeader"
import {nip19} from "nostr-tools"

const replySortFn = (a: NDKEvent, b: NDKEvent) => {
  const followDistanceA = socialGraph().getFollowDistance(a.pubkey)
  const followDistanceB = socialGraph().getFollowDistance(b.pubkey)
  if (followDistanceA !== followDistanceB) {
    return followDistanceA - followDistanceB
  }
  if (a.created_at && b.created_at) return a.created_at - b.created_at
  console.warn("timestamps could not be compared:", a, b)
  return 0
}

type FeedItemProps = {
  event?: NDKEvent
  eventId?: string
  authorHints?: string[]
  truncate?: number
  standalone?: boolean
  showReplies?: number
  showRepliedTo?: boolean
  showActions?: boolean
  asEmbed?: boolean
  asRepliedTo?: boolean
  asReply?: boolean
  onEvent?: (event: NDKEvent) => void
  borderTop?: boolean
}

function FeedItem({
  event: initialEvent,
  eventId,
  authorHints,
  standalone,
  showReplies = 0,
  truncate = standalone ? 0 : TRUNCATE_LENGTH,
  showRepliedTo = standalone,
  showActions = true,
  asEmbed = false,
  asRepliedTo = false,
  asReply = false,
  onEvent,
  borderTop,
}: FeedItemProps) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const eventIdHex = useMemo(() => {
    return getEventIdHex(initialEvent, eventId)
  }, [initialEvent, eventId])

  const [event, setEvent] = useState<NDKEvent | undefined>(
    initialEvent || eventsByIdCache.get(eventIdHex)
  )
  const [referredEvent, setReferredEvent] = useState<NDKEvent>(
    eventsByIdCache.get(eventIdHex)
  )

  if (!event && !eventId)
    throw new Error("FeedItem requires either an event or an eventId")

  const repliedToEventId = useMemo(() => event && getEventReplyingTo(event), [event])
  const rootId = useMemo(() => event && getEventRoot(event), [event])
  const showThreadRoot =
    standalone && rootId && rootId !== eventIdHex && rootId !== repliedToEventId

  const feedItemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (event) {
      onEvent?.(event)
    } else {
      return
    }

    if (!event) return

    let timeoutId: number | undefined
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start the timer when the item becomes visible
            timeoutId = window.setTimeout(() => {
              addSeenEventId(event.id)
              observer.disconnect()
            }, 1000)
          } else {
            // Clear the timer if the item becomes hidden before 1s
            if (timeoutId) {
              window.clearTimeout(timeoutId)
              timeoutId = undefined
            }
          }
        })
      },
      {rootMargin: "-200px 0px 0px 0px"}
    )

    if (feedItemRef.current) {
      observer.observe(feedItemRef.current)
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
      observer.disconnect()
    }
  }, [event])

  useEffect(() => {
    if (event) {
      handleEventContent(event, (referred) => {
        setReferredEvent(referred)
        eventsByIdCache.set(eventIdHex, referred)
      })
    } else {
      fetchEvent({
        ids: [eventIdHex],
        authors: authorHints?.length ? authorHints : undefined,
      }).then((fetchedEvent: NDKEvent | null) => {
        if (fetchedEvent) {
          setEvent(fetchedEvent)
          eventsByIdCache.set(eventIdHex, fetchedEvent)
        }
      })
    }
  }, [eventIdHex])

  const wrapperClasses = classNames("relative max-w-[100vw]", {
    "h-[200px] overflow-hidden": asEmbed && !expanded,
  })

  const expandOverlay = asEmbed && !expanded && (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-base-100 to-transparent" />
      <button
        className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm text-primary hover:underline"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(true)
        }}
      >
        Show More
      </button>
    </>
  )

  if (!event) {
    return (
      <div className={wrapperClasses}>
        <FeedItemPlaceholder
          standalone={standalone}
          asEmbed={asEmbed}
          eventIdHex={eventIdHex}
          onClick={(e) => onClick(e, event, referredEvent, eventId, navigate)}
        />
        {expandOverlay}
      </div>
    )
  }

  return (
    <ErrorBoundary>
      {showThreadRoot && (
        <div className="px-4 py-2 text-sm text-base-content/70">
          <Link
            to={`/${nip19.noteEncode(rootId)}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            View thread root →
          </Link>
        </div>
      )}
      {event.kind === 1 && showRepliedTo && repliedToEventId && (
        <>
          <FeedItem
            borderTop={borderTop}
            asRepliedTo={true}
            eventId={repliedToEventId}
            truncate={truncate}
            onEvent={onEvent}
          />
        </>
      )}
      <div className={wrapperClasses}>
        <div
          ref={feedItemRef}
          className={classNames(
            "flex flex-col border-custom pt-3 pb-0 transition-colors duration-200 ease-in-out relative",
            {
              "cursor-pointer": !standalone,
              "border-b": !asRepliedTo && !asEmbed,
              "border-t": !asReply && borderTop,
              "border pt-3 pb-3 my-2 rounded": asEmbed,
              "hover:bg-[var(--note-hover-color)]": !standalone,
            }
          )}
          onClick={(e) =>
            !standalone && onClick(e, event, referredEvent, eventId, navigate)
          }
        >
          {asRepliedTo && (
            <div className="h-full w-0.5 bg-base-300 absolute top-12 left-9" />
          )}
          {isRepost(event) && (
            <div className="flex flex-row select-none mb-2 px-4">
              <RepostHeader event={event} />
            </div>
          )}
          {event.kind === 7 && (
            <div className="flex flex-row select-none mb-2 px-4">
              <LikeHeader event={event} />
            </div>
          )}
          <div className="flex flex-row gap-4 flex-1">
            <div className={classNames("flex-1 w-full", {"text-lg": standalone})}>
              <FeedItemHeader
                event={event}
                referredEvent={referredEvent}
                tight={asReply || asRepliedTo}
              />
              <div className={classNames({"pl-12": asReply || asRepliedTo})}>
                <FeedItemContent
                  event={event}
                  referredEvent={referredEvent}
                  standalone={standalone}
                  truncate={truncate}
                />
              </div>
            </div>
          </div>
          <div className={classNames("px-4", {"pl-14": asRepliedTo})}>
            {showActions && (
              <FeedItemActions feedItemRef={feedItemRef} event={referredEvent || event} />
            )}
          </div>
        </div>
        {expandOverlay}
      </div>
      {showReplies > 0 && (eventId || event?.id) && (
        <div className="flex flex-col justify-center">
          <Feed
            showRepliedTo={false}
            asReply={true}
            filters={{"#e": [eventIdHex], kinds: [1]}}
            displayFilterFn={(e: NDKEvent) => getEventReplyingTo(e) === event.id}
            onEvent={onEvent}
            borderTopFirst={false}
            emptyPlaceholder={null}
            showReplies={showReplies}
            sortFn={replySortFn}
            showDisplayAsSelector={false}
            displayAs="list"
            showEventsByUnknownUsersButton={!!standalone}
          />
          <FeedItemTitle event={event} />
        </div>
      )}
    </ErrorBoundary>
  )
}

export default FeedItem
