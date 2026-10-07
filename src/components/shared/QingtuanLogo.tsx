import { PixelArt } from './PixelArt';
const rows = [
                '.............................',
                '.............................',
                '......XXXXXXX................',
                '....XXoooooooXX..............',
                '...XoHHooooooooX.............',
                '..XoHHHHooooooooX............',
                '..XoHHHoooooooooX######......',
                '.Xooooooooooooo##wwwwww##....',
                '.Xoooooooooooo#wwwwwwwwww#...',
                '.Xooooooooooo#wwwwwwwwwwww#..',
                '.Xooooooooooo#wwwwwwwwwwww#..',
                '.Xooooooooooo#wwwwwwwwwwww#..',
                '.Xooooooooooo#wwwwwwwwwwww#..',
                '..XXooooooooo#wwwwwwwwwwww#..',
                '....XXXXXXXXXX#wwwwwwwwww#...',
                '...............##########....',
                '.............................',
                '.............................'
            ];
export function QingtuanLogo({ extraClass = "about-pixel-logo" }: { extraClass?: string }) { return <PixelArt rows={rows} classes={{X:'c-edge',o:'c-base',H:'c-hi','#':'w-edge',w:'w-base'}} className={"qt-pixel-logo" + (extraClass ? " " + extraClass : "")} />; }
