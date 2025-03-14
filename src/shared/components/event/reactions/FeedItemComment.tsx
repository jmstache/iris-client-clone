import {NDKEvent, NDKFilter} from "@nostr-dev-kit/ndk"
import {shouldHideEvent} from "@/utils/socialGraph"
import {useEffect, useState} from "react"
import debounce from "lodash/debounce"
import {ndk} from "@/utils/ndk"

import Modal from "@/shared/components/ui/Modal.tsx"
import {formatAmount} from "@/utils/utils.ts"
import {localState} from "irisdb/src"
import Icon from "../../Icons/Icon"

import NoteCreator from "@/shared/components/create/NoteCreator.tsx"
import {getEventReplyingTo} from "@/utils/nostr"
import {LRUCache} from "typescript-lru-cache"

interface FeedItemCommentProps {
  event: NDKEvent
}

let myPubKey = ""
localState.get("user/publicKey").on((k) => (myPubKey = k as string))

const replyCountByEventCache = new LRUCache({maxSize: 100})

function FeedItemComment({event}: FeedItemCommentProps) {
  const [replyCount, setReplyCount] = useState(replyCountByEventCache.get(event.id) || 0)

  const [isPopupOpen, setPopupOpen] = useState(false)

  const handleCommentClick = () => {
    myPubKey && setPopupOpen(!isPopupOpen)
  }

  const handlePopupClose = () => {
    setPopupOpen(false)
  }

  // refetch when location.pathname changes
  // to refetch count when switching display profile
  useEffect(() => {
    const replies = new Set<string>()
    setReplyCount(replyCountByEventCache.get(event.id) || 0)
    const filter: NDKFilter = {
      kinds: [1],
      ["#e"]: [event.id],
    }

    const debouncedSetReplyCount = debounce((count) => {
      setReplyCount(count)
      replyCountByEventCache.set(event.id, count)
    }, 300)

    try {
      const sub = ndk().subscribe(filter)

      sub?.on("event", (e: NDKEvent) => {
        if (shouldHideEvent(e) || getEventReplyingTo(e) !== event.id) return
        replies.add(e.id)
        debouncedSetReplyCount(replies.size)
      })

      return () => {
        sub.stop()
        debouncedSetReplyCount.cancel()
      }
    } catch (error) {
      console.warn(error)
    }
  }, [event.id])

  return (
    <>
      <div
        title="Reply"
        className="flex flex-row items-center min-w-[50px] md:min-w-[80px] items-center gap-1 cursor-pointer hover:text-info transition-colors duration-200 ease-in-out"
        onClick={handleCommentClick}
      >
        <Icon name="reply" size={16} />
        {formatAmount(replyCount)}
      </div>

      {isPopupOpen && (
        <Modal onClose={handlePopupClose} hasBackground={false}>
          <div
            className="max-w-prose rounded-2xl bg-base-100"
            onClick={(e) => e.stopPropagation()}
          >
            <NoteCreator repliedEvent={event} handleClose={handlePopupClose} />
          </div>
        </Modal>
      )}
    </>
  )
}

export default FeedItemComment
