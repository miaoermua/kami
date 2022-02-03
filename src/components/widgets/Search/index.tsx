import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import clsx from 'clsx'
import { EmptyIcon } from 'components/universal/Icons'
import { OverLay, OverlayProps } from 'components/universal/Overlay'
import { useHotKey } from 'hooks/use-hotkey'
import { throttle } from 'lodash-es'
import Link from 'next/link'
import { FC, memo, useEffect, useRef, useState } from 'react'
import { useStore } from 'store'
import { apiClient } from 'utils'
import styles from './index.module.css'

export type SearchPanelProps = {
  defaultKeyword?: string
}

type SearchListType = {
  title: string
  subtitle?: string
  url: string
  id: string
}
const search = throttle((keyword: string) => {
  // 记录每个请求的发送位置
  const cachedPayload = [] as any[]

  // 清理缓存的计时器
  let timer: any
  return new Promise<Awaited<
    ReturnType<typeof apiClient.search.searchByAlgolia>
  > | null>((resolve, reject) => {
    if (!keyword) {
      // 立即清理
      cachedPayload.length = 0
      return resolve(null)
    }

    const index = cachedPayload.push(null) - 1

    apiClient.search
      .searchByAlgolia(keyword)
      .then((data) => {
        cachedPayload[index] = data
        // 只给最后一个请求返回结果
        resolve(cachedPayload[cachedPayload.length - 1])

        if (timer) {
          timer = clearTimeout(timer)
        }
        timer = setTimeout(() => {
          cachedPayload.length = 0
        }, 2000)
      })
      .catch((err) => {
        reject(err)
      })
  })
}, 1000)

export const SearchPanel: FC<SearchPanelProps> = memo((props) => {
  const { defaultKeyword } = props
  const [keyword, setKeyword] = useState(defaultKeyword || '')
  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<SearchListType[]>([])

  useEffect(() => {
    setLoading(true)

    search(keyword)
      ?.then((res) => {
        if (!res) {
          setLoading(false)
          setList([])
          return
        }
        const data = res.data
        if (!data) {
          setLoading(false)
          return
        }
        const _list: SearchListType[] = data.map((item) => {
          switch (item.type) {
            case 'post':
              return {
                title: item.title,
                subtitle: item.category.name,
                id: item.id,
                url: '/posts/' + item.category.slug + '/' + item.slug,
              }
            case 'note':
              return {
                title: item.title,
                subtitle: '生活记录',
                id: item.id,
                url: '/notes/' + item.nid,
              }
            case 'page':
              return {
                title: item.title,
                subtitle: '页面',
                id: item.id,
                url: '/pages/' + item.slug,
              }
          }
        })

        setList(_list)

        setLoading(false)
      })
      .catch((err) => {
        console.log(err)
        setLoading(false)
      })
  }, [keyword])

  return (
    <div
      className="w-[800px] max-w-[80vw] max-h-[60vh] h-[600px] 
    bg-bg-opacity backdrop-filter backdrop-blur-lg
    shadow shadow-light-50 dark:shadow-dark-300
    min-h-50 rounded-xl flex flex-col overflow-hidden text-[--black]"
    >
      <input
        autoFocus
        className="p-4 px-5 w-full text-[16px] leading-4 bg-transparent"
        placeholder="Search..."
        defaultValue={defaultKeyword}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <div
        className={clsx(styles['status-bar'], loading && styles['loading'])}
      ></div>
      <div className="flex-grow flex-shrink relative overflow-overlay">
        <ul className="py-4 px-3 h-full">
          {list.length === 0 && !loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <EmptyIcon />
                <span>无内容</span>
              </div>
            </div>
          ) : (
            list.map((item) => {
              return (
                <li key={item.id}>
                  <Link href={item.url}>
                    <a className={styles['item']}>
                      <span className="block flex-1 flex-shrink-0 truncate">
                        {item.title}
                      </span>
                      <span className="block text-deepgray flex-grow-0 flex-shrink-0">
                        {item.subtitle}
                      </span>
                    </a>
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
})
export const SearchOverlay: FC<OverlayProps> = (props) => {
  const { ...rest } = props

  useHotKey({ key: 'Escape', preventInput: false }, () => {
    props.onClose()
  })
  return (
    <OverLay center {...rest}>
      <SearchPanel />
    </OverLay>
  )
}

export const SearchHotKey: FC = memo(() => {
  const [show, setShow] = useState(false)
  useHotKey({ key: 'k', modifier: ['Meta'], preventInput: false }, () => {
    setShow(true)
  })
  useHotKey({ key: 'k', modifier: ['Control'], preventInput: false }, () => {
    setShow(true)
  })

  useHotKey({ key: '/', preventInput: true }, () => {
    setShow(true)
  })
  return <SearchOverlay show={show} onClose={() => setShow(false)} />
})

export const SearchFAB = memo(() => {
  const [show, setShow] = useState(false)
  const { actionStore } = useStore()
  const idSymbol = useRef(Symbol())
  useEffect(() => {
    actionStore.removeActionBySymbol(idSymbol.current)
    const action = {
      icon: <FontAwesomeIcon icon={faSearch} />,
      id: idSymbol.current,
      onClick: () => {
        setShow(true)
      },
    }
    requestAnimationFrame(() => {
      actionStore.appendActions(action)
    })

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      actionStore.removeActionBySymbol(idSymbol.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <SearchOverlay show={show} onClose={() => setShow(false)} />
})
