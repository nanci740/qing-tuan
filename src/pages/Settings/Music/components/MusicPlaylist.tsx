import { createPortal } from 'react-dom';
import { useMusic } from '../../../../providers/MusicProvider';
import { MusicTrackRow } from './MusicTrackRow';
export function MusicPlaylist() { const music = useMusic(), drag = music.drag; return <>{music.playlist.length ? music.playlist.map((track,index)=><MusicTrackRow key={`${music.revision}-${track.id}-${music.playlist.slice(0,index).filter(item=>item.id===track.id).length}`} track={track} index={drag?.indices.get(track.id) ?? index} isCurrent={track.id===music.currentId} isEditing={track.id===music.editingId}/>) : <div className="music-playlist-empty">还没有添加音乐</div>}{drag && createPortal(<MusicTrackRow track={drag.track} index={drag.index} isCurrent={drag.current} isEditing={drag.editing} ghost style={drag.style}/>,document.body)}</>; }
