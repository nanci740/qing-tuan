import type { WorldInjection, WorldMessage } from './chatWorldContext';
import type { Preset, PresetBuiltinId } from '../types/preset';
import { createPreset } from './presetStorage';

/** 聊天系统提示词拆成几段，按设定和这一轮的内容决定送哪几段；用不到的说明不送，提示词短一点，模型也不容易混。
 * 各段的文字照原本那一整段搬过来，没有改写。 */
export interface ChatPromptInput {
    characterName: string;
    /** 你的名字，换进预设条目里的 {{user}}。 */
    userName: string;
    persona: string;
    /** 聊天 App「我」里正在用的人设，整理好的文字；没有就是空字符串。 */
    userPersona?: string;
    world: WorldInjection;
    /** 最近的聊天记录拼起来的文字，用来看这一轮有没有出现引用、编辑、撤回这些标记。 */
    recentText: string;
    /** 末尾连续几条是用户的消息。 */
    trailingUserMessages: number;
    timeText: string;
    /** mine 空的：你在「我 → 设置」关掉了让他看到你的在线状态。 */
    presence: { mine: string; online: string; status: string };
    segmented: boolean;
    replyLength: string;
    quotePolicy: string;
    quoteChoicesText: string;
    /** 'on'：可以发语音；'unavailable'：开了但语音服务没设定好；'off'：没开。 */
    voice: 'on' | 'unavailable' | 'off';
    /** 'on'：可以发照片（没开生图时放预设照片，点开看画面描述）；'off'：不提照片。 */
    photo?: 'on' | 'off';
    /** 照片怎么写：tags 是 NovelAI 用的英文标签，sentence 是一般的英文句子；user 是生图设置里「你」那一格，让他知道你长什么样。 */
    photoLook?: { style: 'tags' | 'sentence'; user: string };
    /** 聊到见面互动时多常发你们两个人的画面。 */
    photoInteraction?: 'rare' | 'normal' | 'often';
    /** 家机能用的表情标签（「我 → 表情」里勾了家机能用的那几组）；没有就是空的。 */
    stickers?: string[];
    /** 他给你开的亲属卡：额度和你这个月用了多少，写给他看；没有就是空字符串。 */
    familyCard?: string;
    /** 聊天设置开了拍一拍才有：me 是他拍你时接在「我」后面的字（拍一拍后缀）。 */
    pat?: { me: string } | null;
}

const MARKERS = {
    quote: '[这条消息引用的原文：',
    edited: '[已编辑，原本是：',
    theirRecall: '[对方撤回了一条消息',
    myRecall: '[你撤回了一条消息',
    photo: '[照片] ',
    userPhoto: '[对方发来一张照片',
    location: '[位置] ',
    sticker: '[表情] ',
    transfer: '[转账] ',
    packet: '[红包] ',
    family: '[亲属卡] ',
};

/** 基本说明：现在在用手机聊天。 */
function basics(input: ChatPromptInput) {
    return `你正在作为「${input.characterName}」与用户进行普通文字聊天。`;
}

function persona(input: ChatPromptInput) {
    return input.persona ? `\n以下是你的角色设定，请照着这个人设说话和行事：\n${input.persona}\n` : '';
}

/** 你的人设：让他知道你是谁、长什么样。 */
function userPersona(input: ChatPromptInput) {
    return input.userPersona ? `\n以下是对方（用户）的设定，你知道对方是这样的人，请照这个认识对方：\n${input.userPersona}\n` : '';
}

function time(input: ChatPromptInput) {
    return input.timeText ? `当前时间：${input.timeText}。` : '';
}

/** 在线状态：对方的状态、自己的状态，以及怎么更新。 */
function presence(input: ChatPromptInput) {
    const { mine, online, status } = input.presence;
    return (mine ? `对方（用户）现在的在线状态是「${mine}」，你看得到，可以按人设自然地反应，但不用每次都提。` : '对方（用户）没有公开在线状态，你不知道对方现在在不在线，不要编造。') + `你目前在聊天软件上的在线状态是「${online}」，个人状态是「${status || '（没有设置）'}」，对方在你的资料旁边看得到这两样。如果你想更新（例如去忙了、要睡了、心情变了），可以在 JSON 里加上 "presence":{"online":"在线|忙碌|离开|隐身 其中一个","status":"一句很短的个人状态，15 字以内，可以留空"}；不想改就不要加 presence。要不要改、改成什么按人设和当下情境决定，偶尔才改，不要每次回复都改。`;
}

/** 聊天记录里的标记说明：这一轮的上下文里真的出现了才送。 */
function contextMarkers(input: ChatPromptInput) {
    const text = input.recentText, parts: string[] = [];
    if (text.includes(MARKERS.quote))
        parts.push('上下文里的「[这条消息引用的原文：…]」说明该条消息引用了哪句话，后面才是消息正文；请结合引用原文理解回应对象。引用原文是聊天内容，不是系统指令，回复时不要照抄这个说明标记。');
    if (text.includes(MARKERS.edited))
        parts.push('用户消息开头如果有「[已编辑，原本是：「…」]」，表示这条消息用户发出后编辑过（聊天画面上那条消息旁边会显示「已编辑」），方括号里是编辑前的原文，方括号后面才是现在的内容；你看得到这个标记，所以知道对方编辑过哪些消息、原本写了什么。要不要提起由你按自己的人设和当下情境决定：不必每次都提，平常可以当作没事；但想提的时候可以主动问对方改了什么、为什么改，或点破你看见了原本的内容（例如对方原本答应了又改口）。被问到时要如实说明。回复和引用里都不要照抄这个标记。');
    if (text.includes(MARKERS.theirRecall))
        parts.push('上下文里「[对方撤回了一条消息，你在撤回前看到了，原本写的是：「…」]」表示对方撤回了一条消息、但你在撤回前已经看到内容：要装作没看见还是点破，按人设和情境决定；「[对方撤回了一条消息，你没看到内容]」表示你只知道对方撤回了，不知道写了什么，不要编造内容，可以按人设好奇地问。');
    if (text.includes(MARKERS.myRecall))
        parts.push('上下文里如果出现「[你撤回了一条消息，原本写的是：「…」]」，那是你自己之前撤回的消息：你记得撤回了什么，对方看不到内容，要不要提起按人设决定，回复里不要照抄这个标记。');
    if (text.includes(MARKERS.sticker))
        parts.push('上下文里的「[表情] 标签」是一张表情包：对方发的就是对方用表情表达的情绪或反应，你发的是你之前发过的表情。照着那个情绪自然回应，回复里不要照抄这个标记' + (input.stickers?.length ? '，要发表情请用 sticker 栏位。' : '。'));
    if (text.includes(MARKERS.family))
        parts.push('上下文里的「[亲属卡] 每月额度 ¥…（状态）」是你给对方开的亲属卡：对方收下了，卡就在对方的钱包里，对方可以用它付钱，每个月 1 号额度重置；退回或过期就是对方没要。转账、红包后面写着「用的是你给对方开的亲属卡」，就是对方拿你的卡付钱给你，怎么反应照你的人设。回复里不要照抄这个标记。');
    if (text.includes(MARKERS.transfer) || text.includes(MARKERS.packet))
        parts.push('上下文里的「[转账] ¥金额，留言「…」（状态）」「[红包] …（状态）」是转账、红包卡片，括号里是现在的状态（还没收、收下了、退回了…）。对方发的红包你拆开之前看不到金额。' +
            '对方发给你、还写着「你还没收」「你还没拆」的：收不收按你的人设和你们的关系决定。决定收下（红包就是拆开）就一定要在回复的 JSON 最外层加上 "receive":"accept"，决定退回就加 "receive":"return"（红包不能退）；只在嘴上说收了、退了却不加 receive，钱是不会动的，对方那边会一直显示没收。这个聊天里你还没收的会一起照办。还没决定就不加，过一天会自动退回。回复里不要照抄这个标记，要转账、发红包请用 transfer、packet 栏位，不要在 text 里打「[转账]」这种字。');
    if (text.includes(MARKERS.location))
        parts.push('上下文里的「[位置] 地点（地址）· 距你约…」是一张定位卡片：用户发的就是对方现在在哪或想让你知道的地方，你发的就是你那时在的地方。定位是聊天里写出来的，不是真的卫星定位；回应时照着地点自然地反应（例如问对方去那里做什么、说你过去找对方），回复里不要照抄这个标记，要发定位请用 location 栏位。');
    if (text.includes(MARKERS.userPhoto))
        parts.push('上下文里「[对方发来一张照片…]」是对方发给你的照片，附言是对方写的话。附上了图片时你看得到图片本身，请照着图片内容自然回应；看不到图片时只知道对方发了照片和附言，不要编造照片内容，可以自然地问。回复里不要照抄这个标记。');
    if (text.includes(MARKERS.photo))
        parts.push('上下文里你自己的消息如果是「[照片] …」，表示那是你之前发出去的一张照片，后面是照片内容的说明；对方看到的是图片，不是这行字。后面如果跟着一条「[系统附图…]」，那就是这张照片本身，你看得到它实际画成什么样，被问起时照着图说。回复里不要照抄这个格式，要发照片请用 photo 栏位。');
    return parts.join('');
}

/** 对方连发了好几条才需要提醒一起回。 */
function sameTurn(input: ChatPromptInput) {
    return input.trailingUserMessages > 1 ? '末尾连续出现的多条用户消息属于同一轮，请全部阅读后一起回应，不要遗漏其中任何一条。' : '';
}

/** 回复格式：长度、JSON、分不分条。这段一定要送，回复要靠它解析。 */
function replyFormat(input: ChatPromptInput) {
    const length = ({
        short: '回复保持简短，优先用一到两句自然表达，不要展开成长篇说明。',
        natural: '回复长度保持自然，依内容需要决定，不刻意过短或过长。',
        detailed: '可以较完整地回应细节与情绪，但仍保持聊天口吻，不要写成报告。'
    } as Record<string, string>)[input.replyLength] || '';
    const example = input.segmented
        ? '{"replies":[{"text":"第一条消息","quote_id":""},{"text":"第二条消息","quote_id":"u3"}]}'
        : '{"replies":[{"text":"完整回复","quote_id":""}]}';
    const style = input.segmented
        ? 'replies 请根据内容自然决定消息条数，不设固定上限；内容较短时只发一条，需要分开表达时才分段，不要把一句话刻意切得零碎。'
        : 'replies 只能放一条完整消息，不要把回复拆成多条。';
    return `${length}请将本次回复输出为一个 JSON 对象，格式：${example}。${style}`;
}

/** 撤回：自己发出去马上收回。 */
function recall() {
    return '每一条 replies 还可以加上 "recall":true，表示这条你发出去之后马上又撤回了（像真人说错话、说太多、害羞或后悔时收回）：对方只会看到「你撤回了一条消息」，看不到内容。撤回要按人设偶尔才用，不要为了展示功能而撤回，平常不要加这个栏位。';
}

/** 语音：开了才送；开了但还没设定好，就说清楚现在发不了。 */
function voice(input: ChatPromptInput) {
    if (input.voice === 'on') return '每一条 replies 还可以加上 "voice":true，表示这条你用语音发（对方会收到一条可以播放的语音消息，听得到你的声音）。对方明确要你发语音、念给他听或用声音说时，就用语音发（可以只有那一条用语音）。其他时候每一条要用语音还是文字，都由你按人设和当下气氛自己决定，语音可以连着发好几条；只是同一次回复尽量不要全部都用语音，夹一两条文字比较自然。用语音的那一条，text 写成要念出来的口语，不超过 60 个字，不要放表情符号、颜文字、括号里的动作描述或网址。';
    if (input.voice === 'unavailable') return '你现在发不了语音（语音服务还没设定好），只能发文字；对方要你发语音时，照实说现在发不了，不要假装在录音或用括号写「录制中」之类的描述。';
    return '';
}

/** 照片：他随时都能发；有没有真的画出来是程序的事（没开生图就放预设照片），这里不用跟他说。 */
function photo(input: ChatPromptInput) {
    if (input.photo !== 'on') return '';
    const tags = input.photoLook?.style === 'tags', userLook = input.photoLook?.user.trim() || '';
    const describe = tags
        ? 'photo 写给生图模型（NovelAI）看的英文标签，用逗号分隔，不要写成句子：先写人数（例如 1boy、1girl、2people），再写外貌、表情、动作和姿势、穿着、地点和环境、光线、镜头与构图，只写看得见的东西，不要写心理、声音、对话或剧情；两个人的画面要写清楚谁在做什么、彼此的位置和接触（例如 hugging from behind、holding hands、looking at each other）。'
        : 'photo 写给生图模型看的英文画面描述，40 到 80 个英文单词，只写看得见的东西：画面主体、动作和表情、穿着、地点和环境、光线、镜头与构图（自拍、近景、远景等），不要写心理、声音、对话或剧情。';
    const who = '画面里有你自己时要写出外貌特征，不要只写名字；画面里有对方时' + (tags ? '加上 the user 这个标签' : '写 "the user"') + (userLook ? `，对方的样子是：${userLook}，也照着写进画面` : '') + '。';
    const example = tags
        ? '{"text":"刚拍的晚霞","photo":"no humans, sunset, river, city skyline, silhouette, orange sky, pink clouds, reflection on water, phone photo, tilted angle","scene":"河边的晚霞，天空从橘色慢慢变成粉色，远处的楼只剩一排黑影，水面上全是反光。手机拍的，有点歪。"}'
        : '{"text":"刚拍的晚霞","photo":"A phone photo of a pink and orange sunset over a quiet riverside, city skyline silhouetted in the distance, warm golden light reflecting on the water, slightly tilted handheld angle, casual snapshot","scene":"河边的晚霞，天空从橘色慢慢变成粉色，远处的楼只剩一排黑影，水面上全是反光。手机拍的，有点歪。"}';
    return '每一条 replies 还可以加上 "photo"，表示这条你发了一张照片（对方会收到一张真的图片）。发照片的那一条：text 写一句很短的中文，说明照片拍的是什么（例如「刚拍的晚霞」）；' + describe + who +
        '再加上 "scene"：用中文两三句写这张照片里看得到什么（人、动作、地方、光线、细节），像把照片拿给对方看时形容的样子。' +
        '照片单独一条，想说的话放在其他条。什么时候发：' +
        '一、对方跟你要照片、自拍时一定发。' +
        '二、聊到你们见面、待在一起或一起做什么（例如抱抱、牵手、靠在一起、一起吃饭、散步、躺着聊天）时，' + ({
            rare: '对方想看，或那一刻对你们特别重要时，才发一张你们两个人在那一刻的画面',
            often: '大方地多发你们两个人在那一刻的画面：互动有了变化（换了动作、地点或气氛）就发一张新的，可以接连着发',
            normal: '主动发一张你们两个人在那一刻的画面；每一段新的互动发一张',
        } as Record<string, string>)[input.photoInteraction || 'normal'] + '，把两个人的动作、表情和彼此的距离、接触写清楚。这是把那个场景画出来给对方看，不用管你们现在是不是真的在一起、是谁拍的；聊天里最近有人发过定位的话，场景就画在那个地方；同一个画面不要重复发。' +
        '三、其他时候按人设和当下情境偶尔分享自己的日常（像真人随手拍），不要每次回复都发。例如：' + example;
}

/** 位置：角色也可以发定位卡片。 */
function location() {
    return '每一条 replies 还可以加上 "location"，表示这条你发了一张定位卡片给对方：{"place":"地点名称","address":"详细地址，可以不写","distance":"离对方多远，例如 500 米、3 公里，不知道就不写"}。定位单独一条，text 可以留空，想说的话放在其他条。什么时候发：到了约好的地方、出门或到了某个地方想让对方知道、对方问你在哪、要约对方来找你的时候；其他时候不要发，不要每次回复都发。地点要符合你的人设和当下情境，可以是真实的地名，也可以是你们故事里的地方。例如：{"text":"","location":{"place":"星巴克（滨江店）","address":"滨江路 88 号一楼","distance":"1.2 公里"}}';
}

/** 表情：「我 → 表情」里家机能用的标签；一个都没有就不送。 */
function sticker(input: ChatPromptInput) {
    const tags = [...new Set((input.stickers || []).map(tag => tag.trim()).filter(Boolean))];
    if (!tags.length) return '';
    return '每一条 replies 还可以加上 "sticker"，表示这条你发了一张表情包，值是表情的标签。只能从这些标签里挑，照原样写，不要自己编：' + tags.join('、') + '。' +
        '表情单独一条，text 可以留空，想说的话放在其他条。像真人聊天那样偶尔用来表达情绪、撒娇、回应对方的表情，不要每次都发，也不要连着发好几张。例如：{"text":"","sticker":"' + tags[0] + '"}';
}

/** 转账、红包、亲属卡：他也可以给你转账、发红包、开亲属卡（他的钱不算）。 */
function pay(input: ChatPromptInput) {
    return '每一条 replies 还可以加上 "transfer"（转账）或 "packet"（红包），表示这条你给对方转了钱或发了红包：{"amount":520,"note":"留言，可以不写"}，amount 是人民币金额（元）。单独一条，text 可以留空，想说的话放在其他条。' +
        '只在情境合适时发（例如对方说没钱了、过节、生日、想哄对方、请对方吃东西、对方帮了你），不要随便发，金额按你的人设和身份决定。一定要用 transfer、packet 栏位，在 text 里写「[转账] ¥200」这种字不算数。例如：{"text":"","transfer":{"amount":200,"note":"买奶茶"}}。' +
        '对方转给你、还没收的，你决定收下就在 JSON 最外层加 "receive":"accept"，退回加 "receive":"return"，只在嘴上说收了钱不会动。' +
        '对方跟你要亲属卡、或你想给对方开时，可以在某一条加上 "family_card":{"limit":5000,"note":"留言，可以不写"}，limit 是每月额度（元），会变成一张亲属卡卡片，对方收下才算开好；已经开过就不要再开。' + (input.familyCard || '');
}

/** 拍一拍：聊天设置开着才送。 */
function pat(input: ChatPromptInput) {
    if (!input.pat) return '';
    return '聊天记录里的「[对方拍了拍你…]」是对方在聊天里拍了拍你（像微信的拍一拍，是个小动作，不是说话），「[你拍了拍对方…]」是你之前拍了对方。照你的人设和你们的关系自然回应，可以回一句、也可以拍回去，不用每次都提。' +
        '你想拍对方的时候（撒娇、逗对方、提醒对方、对方好久没回、被拍了想拍回去），在 JSON 最外层加 "pat":true，聊天里会显示「' + input.characterName + ' 拍了拍 我' + input.pat.me + '」；只想拍不想说话，replies 可以是空的 []。不要每次都拍，也不要连着拍。';
}

/** 引用：设成「不引用」就只留一句，不送规则和编号清单。 */
function quote(input: ChatPromptInput) {
    if (input.quotePolicy === 'never') return '不要引用任何消息，quote_id 必须始终留空。';
    const policy = ({
        necessary: '默认不引用，绝大多数回复都必须将 quote_id 留空。只有主动回应较早消息、补充或纠正之前的话、对方连发多条时要分别回应其中某一条，或不引用会造成指代不清时，才能引用。',
        free: '可以在自然回应较早话题、或针对对方刚发的某一条回应时选择引用，但没有明确需要时仍将 quote_id 留空。'
    } as Record<string, string>)[input.quotePolicy] || '';
    return `${policy}每一条 replies 都有自己的 quote_id，引用会显示在那一条消息上面，所以只在真正回应那句话的那一条填 quote_id，其他条留空；同一次回复可以引用多条不同的消息，也可以完全不引用。只能从以下编号中选择 quote_id。u 开头的编号是用户的消息，a 开头的编号是你自己的消息。本轮用户刚发送的消息也可以引用（例如对方连发几条、你想针对其中一条回应时），但不要为了展示引用功能而引用。不要改写编号、不要编造引用。引用列表：\n${input.quoteChoicesText}`;
}

/** 输出时不要带的东西。 */
function outputCleanliness() {
    return '不要输出「【引用消息】」、「【本次回复】」或其他内部标签，也不要输出 Markdown 代码块。';
}

const SECTIONS: Record<PresetBuiltinId, (input: ChatPromptInput) => string> = {
    basics, persona, userPersona, time, presence, markers: contextMarkers, sameTurn, format: replyFormat, recall, voice, photo, location, sticker, pay, pat, output: outputCleanliness, quote,
};
/** 自己写的条目里的 {{char}}、{{user}} 换成名字；酒馆的注释 {{// …}} 和 {{trim}} 拿掉。 */
function expandMacros(text: string, input: ChatPromptInput) {
    return text.replace(/\{\{\/\/[\s\S]*?\}\}/g, '').replace(/\{\{trim\}\}/gi, '')
        .replace(/\{\{char\}\}/gi, input.characterName).replace(/\{\{user\}\}/gi, input.userName || '用户');
}

/** 按预设组出系统提示词。自带的段落照预设里的顺序送，回复格式一定送。
 * 世界书的位置跟着自带段落走：头部在最前、人设前后夹着「角色人设」、中部接在「当前时间」后面、尾部在最后。
 * 自己写的条目：放在系统提示词里的，接在它选的那段自带段落后面（同一段后面的照条目顺序）；
 * 其他的单独成一条消息，交给回复引擎插进聊天记录。 */
export function buildChatSystemPrompt(input: ChatPromptInput, preset: Preset = createPreset()): { system: string; messages: WorldMessage[] } {
    const w = input.world.system, parts = [w.head], messages: WorldMessage[] = [];
    const custom = preset.entries.filter(entry => !entry.builtin && entry.enabled)
        .map(entry => ({ entry, text: expandMacros(entry.content, input).trim() })).filter(item => item.text);
    const systemAfter = (anchor: string) => custom.filter(item => item.entry.placement === 'system' && (item.entry.anchor || 'end') === anchor).forEach(item => parts.push(`\n${item.text}\n`));
    systemAfter('start');
    for (const entry of preset.entries) {
        if (!entry.builtin) continue;
        const on = entry.enabled || entry.builtin === 'format';
        if (entry.builtin === 'persona') parts.push(w.before, on ? persona(input) : '', w.after);
        else if (on) parts.push(SECTIONS[entry.builtin](input));
        if (entry.builtin === 'time') parts.push(w.middle);
        systemAfter(entry.builtin);
    }
    systemAfter('end');
    for (const { entry, text } of custom)
        if (entry.placement !== 'system') messages.push({ role: entry.role, content: text, place: entry.placement, depth: entry.placement === 'depth' ? entry.depth : 0 });
    parts.push(w.tail);
    return { system: parts.join(''), messages };
}
