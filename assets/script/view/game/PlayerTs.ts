import { _decorator, Component, Node, math, Vec3, director, v3, game,} from 'cc';
import { Actor } from '../../managerGame/Actor';
import { EffectConst } from '../../const/EffectConst';
import { RunGameInfoVo } from '../../data/povo/RunGameInfoVo';
import { OnOrEmitConst } from '../../const/OnOrEmitConst';
import { VirtualInput } from '../../data/dynamicData/VirtualInput';
import { ActorState } from '../../const/ActorState';
import { EffectManager } from '../../managerGame/EffectManager';
import { ProjectileEmitter } from '../../managerGame/ProjectileEmitter';
import { ProjectileManager } from '../../managerGame/ProjectileManager';
import { MonsterManager } from '../../managerGame/MonsterManager';
import { Monster } from '../../managerGame/Monster';
import { MathUtil } from '../../utils/MathUtil';
import { GameStateInput } from '../../data/dynamicData/GameStateInput';
import { LevelConfigVo } from '../../data/povo/LevelConfigVo';
import { CareerRoleConfig, CareerRoleConfigs, CareerRoleId, CareerRolePerks, CareerSpecializationUnlockLevel } from '../../const/CareerConfig';
import { CareerBranchId, CareerTechBranchConfig, CareerTechTreeConfigs, findCareerTechBranch, findCareerTechMilestone } from '../../const/TechTreeConfig';

const { ccclass, property} = _decorator;
const tempShootStart = v3();
const tempPlayerPos = v3();
const tempDropPlayerPos = v3();
const tempDropNodePos = v3();
const tempDropStep = v3();
const tempCareerForwardL = v3();
const tempCareerForwardR = v3();

type EliteDropInfo = {
    node: Node;
    bornTime: number;
    rewardExp: number;
    rewardHeal: number;
    baseY: number;
};

type CareerMilestonePreview = {
    branch: CareerTechBranchConfig;
    milestoneId: string;
    milestoneTitle: string;
    requiredBranchLevel: number;
    costSkillPoint: number;
    missingBranchLevel: number;
    missingSkillPoint: number;
    ready: boolean;
    isFocus: boolean;
};

@ccclass('PlayerTs')
export class PlayerTs extends Component {

    private actor:Actor = null;

    @property(Node)
    bowString: Node = null;

    shootTime: number = 0.0;
    private _splitAngle: number[] = [0];

    private playerDoKill: number = 0;
    private eliteKillCount: number = 0;

    private projectileTraceEnabled: boolean = true;
    private projectilePenetration: number = 1;
    private attackIntervalDebuffScale: number = 1;
    private attackIntervalDebuffRemain: number = 0;
    private careerRoleId: CareerRoleId = 'student';
    private careerShotCounter = 0;
    private careerHitHealCooldown = 0;
    private careerBranchPoints: Record<string, number> = {};
    private careerMilestones: Record<string, number> = {};

    private eliteDrops: EliteDropInfo[] = [];
    private eliteDropCollectRadius = 1.8;
    private eliteDropMagnetRadius = 6.0;
    private eliteDropLifeTime = 18;
    private eliteDropRewardExp = 12;
    private eliteDropRewardHeal = 10;

    private eliteLootAttack = 14;
    private eliteLootAttackInterval = -0.14;
    private eliteLootProjectile = 1;
    private eliteLootPenetration = 1;
    private eliteLootMoveSpeed = 1;
    private eliteLootMaxHp = 25;

    start() {
        this.actor = this.node.getComponent(Actor);
        // 闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣捣閻棗銆掑锝呬壕濡ょ姷鍋涢ˇ鐢稿极瀹ュ绀嬫い鎺嶇劍椤斿洦绻濆閿嬫緲閳ь剚娲熷畷顖烆敍濮樿鲸娈鹃梺鍝勮閸庢煡鎮￠弴鐘亾閸忓浜鹃梺閫炲苯澧寸€规洘娲熼獮瀣偐閻㈡妲搁梻浣告惈缁嬩線宕㈡禒瀣亗婵炲棙鎸婚悡鐔镐繆閵堝倸浜鹃梺缁橆殔閿曪箑鈻庨姀銈嗗殤妞ゆ帒鍊婚敍婊堟⒑闁偛鑻晶顕€鏌ｉ敐鍡欑疄鐎规洜鍠栭、妤呭磼濮橆剛顔囬梻浣筋嚙妤犲摜绮诲澶婄？閺夊牃鏅滃畷鏌ユ煙閻戞﹩娈曢柛瀣ф櫊濮婃椽顢楅埀顒傜矓閻㈠憡鍋傞柣鏂垮悑閻撱儵鏌￠崘銊モ偓鐟扳枍閺囥垺鐓熸い鎾跺枎濞搭噣鏌″畝鈧崰鏍€佸▎鎾村亗閹肩补鎳ｉ埡鍛拺閻庡湱濯崵娆撴⒑鐢喚绉柣娑卞櫍瀹曞爼顢楁径瀣珜闂備胶顭堢悮顐﹀磹閺囥垹绀堟い鎺嗗亾闁宠鍨块幃鈺呭垂椤愶絾鐦庨梻浣侯焾椤戝棝鎯勯鐐茬畺鐟滃海鎹㈠┑瀣倞鐟滃秹鎮楅銏♀拺闁告捁灏欓崢娑㈡煕閻樺啿鍝虹€殿喗濞婇弫鍐磼濞戞艾寮虫繝鐢靛█濞佳兾涢鐐嶏綁宕妷褎锛忛梺璇″瀻閸愨晛鈧垳绱撴担铏瑰笡闁烩晩鍨堕悰顔锯偓锝庡枟閸婄兘鏌涢…鎴濅簻婵炲懏顨嗘穱?
        this.runGameInit();
        // this.node.on("onFrameAttackLoose", this.onFrameAttackLoose, this);
        this.node.on(OnOrEmitConst.OnKill, this.onKill, this);
        this.node.on(OnOrEmitConst.PlayerOnDie, this.playerOnDie, this);
    }

    onDestroy(){
        this.node.off(OnOrEmitConst.OnKill, this.onKill, this);
        this.node.off(OnOrEmitConst.PlayerOnDie, this.playerOnDie, this);
        this.clearEliteDrops();
    }

    update(deltaTime: number) {
        if (!GameStateInput.canUpdateWorld()){
            return;
        }
        this.updateEliteDrops(deltaTime);
        if (this.attackIntervalDebuffRemain > 0){
            this.attackIntervalDebuffRemain -= deltaTime;
            if (this.attackIntervalDebuffRemain <= 0){
                this.attackIntervalDebuffRemain = 0;
                this.attackIntervalDebuffScale = 1;
            }
        }
        if (this.careerHitHealCooldown > 0){
            this.careerHitHealCooldown -= deltaTime;
        }

        this.actor.input.x = VirtualInput.horizontal;
        this.actor.input.z = -VirtualInput.vertical;

        if (this.actor.input.length() > 0){
            this.actor.changeState(ActorState.Run);
        }else{
            this.actor.changeState(ActorState.Idle);
        }
        this.shootTime += deltaTime;
        const currentAttackInterval = this.getCurrentAttackInterval();
        if (this.shootTime > currentAttackInterval){
     
            // 闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣捣閻棗銆掑锝呬壕濡ょ姷鍋為悧鐘汇€侀弴銏℃櫆闁芥ê顦純鏇㈡⒒娴ｈ櫣銆婇柛鎾寸箞閹藉倻鈧綆鍠栭悙濠囨煏婵炲灝鍔撮柛銈冨€濆娲传閸曞灚效闂佹悶鍔岀紞濠傤嚕閺勫浚妲诲銈庝簻閸熷瓨淇婇崼鏇炲耿婵°倐鍋撶悰鑲╃磽閸屾瑧鍔嶇憸鏉垮暙椤洭鏁撻悩鍙傘儵鏌涘☉娆愮稇闁藉啰鍠栭弻鏇熷緞濞戞﹩娲梺鍛娒畷顒勫煘閹达附鍋愮紓浣股戦柨顓炩攽閳藉棗浜濇い銊ワ躬閵嗕線寮崼顐ｆ櫆闂佸壊鍋嗛崰鎾诲储娴犲鈷戦梻鍫熶緱閻擃厾绱掗悩鍐茬伌闁诡喗锕㈤獮姗€顢欓悾灞藉箰闁诲骸鍘滈崑鎾绘倵閿濆骸澧伴柣锕€鐗撳铏瑰寲閺囩喐婢掗梺绋款儐閹告悂鈥旈崘顔嘉ч柛鈩冾殘閻熴劑姊虹粙鍖″伐婵犫偓闁秴鐒垫い鎺嶈兌椤ｈ尙鈧厜鍋撻柟闂寸閽冪喖鏌ｉ弮鍥仩缁炬儳鍚嬫穱濠囶敍濠靛浂浠╅梺鑽ゅ枑閻撯€愁潖閻戞ê顕辨繛鍡樻尰椤庡秹姊虹紒姗嗘畼濠殿喗鎸抽敐鐐剁疀閹句焦妞介、鏃堝礋椤撗冩暪闂備胶顢婃竟鍫ュ箵椤忓棗绶ら柛婵嗗珋閿濆閱囬柕澶涜吂閹锋椽姊洪崨濠勭畵閻庢凹鍠楅弲鍫曟焼瀹ュ棛鍘遍梺瑙勫礃濞夋盯寮稿☉娆樻闁绘劕寮堕ˉ銏ゆ煕閳规儳浜炬俊鐐€栫敮鎺斺偓姘煎弮閹繝寮撮悢铏诡啎闂佺懓顕崑鐔煎箠閸曨厾纾界€广儱妫楅悘鎾煙椤旂瓔娈旀い顐ｇ箞椤㈡寰勭€ｆ搫绠戦—鍐Χ鎼粹€崇哗濠电偛顦板ú鐔肩嵁閹达箑绀嬫い鏍ㄧ☉娴犲繘鏌ｆ惔銏⑩姇閽冮亶鏌￠崱鏇炲祮婵﹦绮幏鍛村捶椤撶喕寮撮梻浣告啞閺屻劎绮旈悷鎵殾鐟滅増甯掗柨銈嗕繆閵堝倸浜鹃梺钘夊暟閸犳牠寮婚妸鈺傚亜闁告繂瀚呴姀銏㈢＜闁逞屽墰閳ь剨缍嗛崰妤呭煕閹烘鐓曟い鎰╁€曢弸鏃堟煏閸℃ê绗掗棁澶愭煟濞嗗苯浜鹃梺鎼炲姀濞夋盯锝炶箛娑欐優闁稿繐顦禍楣冩煕閿旇骞栨い搴℃湰缁绘盯宕楅悡搴☆潚闂佸搫鐭夌徊鍊熺亙闂佸憡鍔戦崜閬嶅鎺虫禍?
            let enmey = this.getNearEnemy();
            if (enmey != null) {
                // 婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柟闂寸绾惧鏌ｉ幇顒佹儓闁搞劌鍊块弻娑㈩敃閿濆棛顦ョ紓浣哄С閸楁娊骞冭ぐ鎺戠倞鐟滃秴螞濮椻偓閺屻劌鈹戦崱鈺傂︾紓浣哄Ь濞呮洘绌辨繝鍥ч柛婊€绀侀崜宕囩磽娴ｅ壊鍎忕紒缁樺姍閸╃偤骞嬮悙鑼枃闂備胶顭堥敃銉ッ洪悢鑲╁祦濠电姴鎳愰悿鈧┑鐐茬摠濠㈡﹢藝闂堟稓鏆﹂柛妤冨亹濡插牊绻涢崱妯虹仴閻㈩垱顨婇弻锝夋偄閸濄儳鐓佺紓渚囧枟閹告悂鎮惧畡閭︾叆闁告劧绲鹃～宥夋⒑闂堟稓绠冲┑顔惧厴閹潡宕ㄧ€涙ǚ鎷虹紓鍌欑劍閿曗晛鈻撻弮鍫熺厽婵°倐鍋撻柨鏇樺劦瀹曟碍绻濋崶褏顔掑銈嗘濡嫭绂掗鐐╂斀闁绘劕寮堕ˉ婊呯磼缂佹ê濮嶆い銏℃椤㈡洟鏁傞悾灞藉箺闂備焦瀵уú宥夊磻閹炬番浜滈柟瀛樼箥濡插憡銇勯銏㈢鐎规洦鍋婂畷婵嬪磹閻斿壊浠╅梺褰掝棑婵炩偓闁绘搩鍋婇、姗€鎮╅棃娑氬帗闂傚倸鍊搁崐鐑芥嚄閸洍鈧箓宕奸妷顔芥櫈闂佺硶鍓濈粙鎴犵不閺屻儲鐓曢柕澶樺枛婢ь噣鏌﹂崘顏勬灈闁哄苯绉归崺鈩冩媴閸涘﹥顔夊┑鐘愁問閸ㄤ即顢氶鐘愁潟闁圭儤鏌￠崑鎾绘晲鎼粹€茶埅闂佺绨洪崕鑼崲濞戙垹閱囨い鎰╁灩缁犲綊姊虹€圭媭娼愰柛銊ユ健閵嗕礁鈻庨幘鏉戔偓閿嬨亜閹哄棗浜惧┑鐐茬墕閼活垶鈥旈崘顔嘉ч煫鍥ㄦ礈閺嗐倕鈹戦悙鏉垮皟闁搞儴鍩栭弲顏堟⒑閹稿海绠撴い锔跨矙瀵偊宕卞☉娆戝幈闂佸搫娲㈤崝灞炬櫠椤旀祹褰掓偑閳ь剟宕ｉ崘顭戞綎闁惧繐婀辩壕鍏兼叏濡も偓濡瑩鎮鹃崼鏇熲拺缂備焦锕╁▓鏃€淇婇锝囩疄鐎规洘妞介崺鈧い鎺嶉檷娴滄粓鏌熼崫鍕棞濞存粍鍎抽—鍐Χ鎼粹€崇闂佺绻戦敋妞ゆ洩绲剧换婵嗩潩椤撶喐顏熼梻浣虹帛椤牏浜稿▎鎾嶅洭濡搁妷顔藉瘜闂侀潧鐗嗘鎼佺嵁濡ゅ懏鐓曢柕濞у嫭姣堥悗瑙勬礃缁挸螞閸愩劉妲堥柟鐑樻尰閺夋悂姊绘担铏瑰笡闁告梹娲熼幃娲Ω瑜忕粈濠囨煙鐎电浠掔紒璇叉閵囧嫰骞囬崜浣瑰仹缂備胶濮烽崑鐔煎焵椤掍緡鍟忛柛锝庡櫍瀹曟垿宕熼锝嗘櫍婵犻潧鍊婚…鍫ユ倷婵犲洦鐓ラ柡鍐ㄦ处椤ュ鈹戦娆忓祮婵﹦绮幏鍛槹鎼存繆顩紓鍌欐祰瀵挾鍒掑▎蹇ｅ殨闁汇垹澹婇弫鍡涙煕閺囥劌浜為柣銈呮嚇濮婃椽妫冨☉姘暫濡炪倧缂氶崡鍐茬暦閹版澘鍨傛い鎰╁€楅鏇㈡⒑閸撴彃浜濈紒璇插缁傛帡濮€閿涘嫮顔曢梺鍛婁緱閸樼偓鏅ラ梻浣告惈閼活垳绮旈悜閾般劍绗熼埀顒勫蓟濞戙垹绠婚悗娑欘焽濞堛倗绱撴笟鍥ф灍闁荤啿鏅犻悰顔嘉熼懖鈺冿紲濠碘槅鍨伴幖顐ｆ櫠妤ｅ啯鐓熼幖杈剧磿閻ｎ參鏌涙惔銊ゆ喚閽樻繂霉閻撳海鎽犻柛瀣€圭换娑㈠箣濞嗗繒浠鹃梺缁樻尰濞叉﹢濡甸崟顖氱疀闁宠桨璁查崑鎾诲即閵忕姴鍤戦梺鍝勫暙閸婅崵澹曟總鍛婄厽婵☆垱瀵ч悵顏嗏偓瑙勬礀閻倿寮婚垾宕囨殕闁逞屽墴瀹曚即寮介婧惧亾娴ｇ硶鏋庨柟鐐綑娴犲ジ鎮楅崗澶婁壕闂侀€炲苯澧撮柟顔瑰墲瀵板嫰骞囬鐐╁亾閸偆绠鹃柛顐ｇ箘娴犮垺绻涢崨顕嗚€块柡灞剧〒閳ь剨缍嗘禍婵嬎夐悙鐢电＜闁稿本绋戝ù顕€鏌℃担绋挎殻鐎规洘甯掗～婵囶潙閺嶃剱婵嬫⒒閸屾瑧顦﹂柛姘儑缁﹪骞橀鑲╂煣濠电姴锕ら幊鎾存叏?
                // 闂傚倸鍊搁崐鎼佸磹閹间礁纾圭€瑰嫭鍣磋ぐ鎺戠倞鐟滄粌霉閺嶎厽鐓忓┑鐐戝啯鍣介柣鎺戝悑缁绘稒娼忛崜褍鍩屽┑鐘亾闂侇剙绉甸埛鏃堟煕閺囥劌鐏￠柣鎾寸洴閺屾稓浠﹂崜褜鏆″┑鐐叉噹濞层劑骞夐崨濠冨劅闁宠棄妫楀▓顐︽⒑閸涘﹥澶勯柛妯绘倐瀹曟垿骞樼紒妯绘珳闁硅偐琛ラ埀顒€鍟跨粻锝夋⒒娴ｅ憡鎯堟い鎴濇閹囨偐鐠囪尪鎽曢梺缁樻煥閸氬宕戦崒鐐茬閺夊牆澧界粙濠氭煙閼艰泛浜圭紒杈ㄦ尰閹峰懐绮电€ｎ亝顔勯梻浣侯焾閿曘倕顭囬敓鐘靛祦闁糕剝蓱婵挳鏌涢幘鐟扮毢闁告瑥妫濆娲礈閹绘帊绨介梺鍝ュТ鐎涒晝绮嬮幒妤婃晣闁绘劏鏅滈弬鈧梻浣虹帛閸旀洖顕ｉ崼鏇€澶愭倷閻戞鍘遍梺鍝勫暊閸嬫挻绻涢崣澶岀煂闁告帗甯￠、姗€鍩ラ崱妯烆亞绱撻崒娆掑厡缂侇噮鍨堕幆鍕敍濮樿鲸娈炬繝闈涘€搁幉锟犲磻閸曨偒娓婚悗锝庝簽閸戝湱绱掓潏銊х疄闁哄矉绲鹃幆鏃堝閳轰焦娅涢梻渚€娼荤紞鍡涘闯閿濆懐鏆︽繝濠傜墛閸嬪嫰鏌ｉ幘铏崳闁伙絾妞藉铏圭磼濡櫣浼囨繝娈垮枔閸婃繂鐣烽幋鐘亾閿濆骸鏋熼柣鎾存礃閵囧嫰骞囬崜浣瑰仹婵犵鈧櫕鍠橀柡?
                Vec3.subtract(this.actor.angleInput, enmey.worldPosition, this.node.worldPosition);
                this.actor.angleInput.y = 0;
                this.actor.angleInput.normalize(); 
                // this.actor.changeState(ActorState.Attack);
                this.onFrameAttackLoose(enmey);                
            }else {
                this.actor.angleInput.x = VirtualInput.horizontal;
                this.actor.angleInput.z = -VirtualInput.vertical;
                this.actor.angleInput.normalize();
            }
            this.shootTime = 0;
        }
    }

    onFrameAttackLoose(target: Node = null){
        const arrowStartPos = this.resolveShootStart(tempShootStart);
        let arrowForward: Vec3 = v3();
        const emitter = this.node.getComponent(ProjectileEmitter);
        if (!emitter){
            return;
        }

        for (let i=0; i < this.actor.rungameInfo.projectileCount; i++){
            
            MathUtil.rotateAround(arrowForward, this.actor.angleInput, Vec3.UP, this._splitAngle[i]);

            let projectile = emitter.create();
            // 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌ｉ幋锝呅撻柛濠傛健閺屻劑寮村鑸殿€栨繛瀛樼矊缂嶅﹪寮诲☉銏犵疀闁稿繐鎽滈弫鏍⒑濞茶骞楅柟鐟版喘瀵鈽夐姀鈺傛櫇闂佹寧绻傚Λ娑⑺囬妸鈺傗拺缂佸顑欓崕娑樏瑰搴濋偗鐎殿喛顕ч埥澶愬閻橀潧濮堕梻浣告啞閸旓附绂嶅┑瀣獥婵炴垯鍨洪埛鎴犵磼鐎ｎ偒鍎ラ柛搴㈠姍閺岀喖宕ㄦ繝鍐ㄢ偓鎰版煕閳瑰灝鍔滅€垫澘瀚换娑㈡倷椤掑倵鍋撳ú顏呪拺闁诡垎鍕洶闂佺顑呯€氫即骞冨鈧俊鐑芥晜鏉炴壆鐩庢俊鐐€曠换鎰偓姘煎墴瀵娊鏁愰崶锝呬壕閻熸瑥瀚粈鍫熴亜椤撶偟澧ｉ柣蹇撳暣濮婃椽鏌呴悙鑼跺濠⒀傚嵆閺岋絽顫濋鐐插Б濡炪倖鎸搁崥瀣嚗閸曨厸鍋撻敐搴″妤犵偛鐗婃穱濠囨倷椤忓嫧鍋撻弽顓炵鐟滃繐顕ユ繝鍥х鐟滃繘鎯岄崱娑欑厱闁逛即娼ч弸鐔兼煟?
            projectile.startTime = 0;
            projectile.host = this.node;
            const useTrace = this.projectileTraceEnabled && !!target;
            projectile.node.forward = arrowForward;
            projectile.node.worldPosition = arrowStartPos;
            this.careerShotCounter += 1;
            this.configureProjectile(projectile, useTrace ? target : null, useTrace, false);
        }
        this.trySpawnCareerExtraProjectiles(emitter, arrowStartPos, target);
    }

    private resolveShootStart(out: Vec3): Vec3{
        this.node.getWorldPosition(tempPlayerPos);
        if (this.bowString && this.bowString.isValid){
            this.bowString.getWorldPosition(out);
            if (Vec3.distance(out, tempPlayerPos) < 6){
                return out;
            }
        }
        out.set(tempPlayerPos);
        out.y += 1.0;
        return out;
    }

    // 婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柟闂寸绾惧潡鏌熺€电孝缂佽翰鍊濋弻锕€螣娓氼垱锛嗛悷婊呭鐢帞澹曟總鍛婄厽闁归偊鍨伴惃娲煟濞戞牕鍔氶柍瑙勫灦楠炲﹪鏌涙繝鍐╃妤犵偛锕ラ幆鏃堝Ω閵夈儱娈ゅ┑鐐存尰閸╁啴宕戦幘缁樼厸閻忕偠顕ч埀顒佹礋濠€渚€鏌ｆ惔顖滅У闁稿鎳橀幃鐢稿即閵忊檧鎷洪梺鍛婄缚閸庡崬鐡繝纰樻閸嬪懐鎹㈤崼婵愬殨濠电姵纰嶉崑鍕煕韫囨洖甯堕柍褜鍓涚划顖涚┍婵犲浂鏁嶆繝闈涙閹偛顪冮妶蹇氱闁稿酣浜堕垾鏃堝礃椤斿槈褔鏌涢幇鈺佸濠殿喖娴风槐鎾存媴閾忕懓绗￠梺鎸庢磸閸ㄥ綊顢氶敐鍡欑瘈婵﹩鍘藉▍婊勭節閵忥絾纭剧拫鈺呮煃閸濆嫭鍣洪柣鎾崇箰椤法鎹勯搹鐟邦暫闂佸憡姊瑰娆撴箒闂佺粯锚閻即宕戦姀鈩冨弿濠电姴鍟妵婵嬫煙椤旂晫鐭掗柛鈹惧墲閹峰懐鍖栭弴鐔风彾闂傚倸鍊峰ù鍥х暦閻㈢绐楅柛鈩冪☉绾惧潡鏌ｉ姀鈩冨仩闁逞屽厸缁€渚€锝炲┑瀣殝闁割煈鍋呴悵鎶芥⒒娴ｈ鍋犻柛搴灦瀹曟繂鐣濋崟顐㈠殤闂佺鐬奸崑鐐哄煕閹达附鐓曟繛鎴烇公閺€璇差熆鐠哄搫顏柡灞剧洴楠炴﹢寮堕幋婵囨嚈婵＄偑鍊戦崹娲偡閵夆晩鏁囬柛蹇曞帶缁剁偤鎮楅敍鍗炲椤?
    setProjectileCount(count: number){
        this.actor.rungameInfo.projectileCount = count;
        this._splitAngle = [];

        // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜忛弳锕傛煟閵忋埄鐒剧紒鎰殜閺岀喖骞嶉纰辨毉闂佺顑戠换婵嬪蓟閵娾晛绫嶉柛灞剧煯婢规洟姊洪崫鍕棡缂侇喗鎹囧濠氭偄閸忕厧鈧粯淇婇婵嗗惞闁告ɑ鎮傚铏圭矙濞嗘儳鍓遍梺鐟版啞閸庢娊鍩ユ径鎰仺缂佸鐏濈粣娑橆渻閵堝棙鈷愰柛搴″暱閳藉顦崇紒缁樼箞閹粙妫冨☉妤佸煕闂備礁鍟块崲鏌ユ偋婵犲嫮鐭夌€广儱顦介弫鍌炴煕椤愶絿鈻撻柛瀣尰閹峰懘鎳栧┑鍥棃鐎规洏鍔戦、姗€鎮╅幓鎹洖鈹戦敍鍕杭闁稿﹥鐗滈弫顔界節閸ャ劌鈧潡鏌ㄩ弴鐐测偓鎼佹儗濡ゅ懐鍙撻柛銉ｅ妽閻撶喎霉濠婂嫮鐭掗柡宀€鍠栧畷顐﹀礋椤撳鍊濋弻娑㈠棘鐠恒剱褔鏌?
        const rad = math.toRadian(10);

        const isOdd = count % 2 != 0;
        
        const len = Math.floor(count/2);
        for (let i = 0; i < len; i++){
            this._splitAngle.push(-rad * (i+1));
            this._splitAngle.push(rad * (i+1));
        }

        if(isOdd){
            this._splitAngle.push(0);
        }
    }

    getNearEnemy():Node{
        let minDistance = 9999;
        let minNode: Node = null;

        // 闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣捣閻棗銆掑锝呬壕閻庤娲忛崕鎶藉焵椤掑﹦绉甸柛鐘崇墱婢规洟宕稿Δ浣哄幍闂佽鍨虫晶妤吽夋径鎰闁哄鍩婇煬顒勬煛鐏炶鈧繈骞婂┑瀣妞ゆ棁鍋愭晶顖氣攽閻愯尙鎽犵紒顔肩灱缁辩偞绻濋崶褑鎽曞┑鐐村灟閸ㄧ懓鏁俊鐐€栧濠氬储瑜旈敐鐐哄煛閸涱喒鎷洪梺鍛婄箓鐎氱兘宕曟惔锝囩＜闁兼悂娼ч崫鐑橆殽閻愭彃鏆欐い顐ｇ矒閸┾偓妞ゆ帒瀚粻鏍ㄧ箾閸℃ɑ灏紒鐘垫暬閺岀喖鎮滃Ο璇茬闂侀€炲苯澧婚柛銊ㄦ硾椤繘宕崝鍊熸閹峰鐣烽崶銊︽缂傚倸鍊峰鎺旀閳ユ緞?
        for (let goalId of MonsterManager.instance.goalvoes.keys()){
            let entrie = MonsterManager.instance.goalvoes.get(goalId);
            if (!entrie || !entrie.mSphere || !entrie.mSphere.isValid){
                continue;
            }
            let actorForOne = entrie.mSphere.getComponent(Monster);
            if (!actorForOne){
                continue;
            }
            if (actorForOne.distance < minDistance){
                minDistance = actorForOne.distance;
                minNode = entrie.mSphere;
            }
        }
        if (minNode){
            if (minNode.getComponent(Monster).distance > 600){
                minNode = null;
            }
        }
        
        return minNode;
    }

    onKill(killTarget: Node = null, expReward: number = 1, isEliteKill: boolean = false, isBossKill: boolean = false, deathPos: Vec3 = null){
        // 婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柛娑橈攻閸欏繑銇勯幘鍗炵仼缂佺媭鍨堕弻娑㈠箛闂堟稒鐏堥悗鐟版啞缁诲啴濡甸崟顖氱閻庨潧鎽滈悾濂告⒑绾拋娼愭繛鍙夌墵閸╃偤骞嬮敂钘変汗闂佸綊顣︾粈渚€寮查柆宥嗏拺闁告縿鍎辨牎閻庡厜鍋撶紒瀣硶閺嗭箓鏌熸潏楣冩闁稿瀚伴弻锝夊箣閻戝洣绶靛┑鐐跺亹閸犳牕顫忓ú顏勬嵍妞ゆ挾鍋涙俊鍝勨攽閻愭彃绾х紒顔芥崌楠炲啴宕稿Δ鈧悞鍨亜閹哄棗浜鹃梺瀹狀潐閸ㄥ潡骞冨▎鎾崇骇闁瑰濮冲鎾绘⒒娴ｅ搫甯剁紓宥咃功缁寮介鐐电暰?
        const gainExp = Math.max(1, Math.floor(expReward));
        this.addExp(gainExp);
        this.applyCareerKillReward(isEliteKill, isBossKill);

        // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜忛弳锕傛煕椤垵浜濋柛娆忕箻閺岀喖骞嗛弶鍟冩捇鏌涙繝鍌涘仴闁哄被鍔戝鏉懳旈埀顒佺閹屾富闁靛牆楠搁獮鏍煟韫囨梻绠氶柣蹇斿浮濮婃椽宕楅懖鈹垮仦闂佸搫鎳忕换鍫ｆ濡炪倖鐗滈崑鐐哄磹閸偒娈介柣鎰皺娴犮垽鏌涢弮鈧喊宥嗙┍婵犲浂鏁冮柨婵嗘处閸掓盯姊虹化鏇熸澓闁搞劏妫勯锝夘敋閳ь剙鐣锋總鍛婂亜闁告繂瀚粻浼存⒒閸屾瑧顦﹂柟娴嬧偓瓒佹椽鏁冮崒姘憋紱闂佸憡渚楅崹鎶芥儗婢舵劖鍊甸柨婵嗛娴滅偟绱掗悩鎻掆挃闁汇儺浜、姗€濮€閳哄偆妫栫紓鍌欒濡狙囧磻閹剧粯鈷掑ù锝呮啞閹牓鏌￠崼顐㈠⒋闁诡垰瀚伴、娑㈡倷闂堟稓銈﹂梺璇插嚱缂嶅棝宕板Δ鍛；闁规壆澧楅埛鎺楁煕椤愩倕鏋旈柕鍡樺笚閵囧嫰骞囬鈧幃鎴犵磼缂佹绠為柟顔荤矙濡啫鈽夊Δ浣哥厱闂傚倷绀侀幉锟犫€﹂崱娑樼倞鐟滃繘寮婚崼銉︹拺闁告繂瀚峰Σ褰掓煕閳轰胶澧︾€规洜鏁诲鎾偄缂堢姷鐩庨梻浣筋潐濠㈡ɑ鏅舵惔銊ョ闁绘鐗勬禍婊堟煛閸ヨ埖绶氶柟鏌ョ畺閺岋紕浠︾粙鍨拤閻庡灚婢樼€氼噣鍩€椤掑﹦绉靛ù婊呭仦缁傛帞绮欏▎鐐瘜?
        this.playerDoKill ++;

        if (isEliteKill){
            this.eliteKillCount += 1;
            const lootDesc = this.applyEliteLootReward();
            director.getScene().emit(OnOrEmitConst.OnEliteKilled, this.eliteKillCount, gainExp, lootDesc, deathPos);
            if (killTarget && killTarget.isValid){
                this.spawnEliteCoreDrop(killTarget.getWorldPosition());
            }
        }

        if (isBossKill){
            director.getScene().emit(OnOrEmitConst.OnBossKilled, gainExp, this.actor.rungameInfo.level);
        }

        if (this.playerDoKill > this.actor.rungameInfo.projectileCount * 10){
            let a  = this.actor.rungameInfo.projectileCount + 2;

            // 缂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻锝夊箣閿濆憛鎾绘煕婵犲倹鍋ラ柡灞诲姂瀵挳鎮欏ù瀣壕鐟滅増甯掔壕濠氭煥閻斿搫校闁绘挸绻橀弻娑㈩敃閿濆洨鐣虹紓浣插亾鐎光偓閸曨剛鍘遍柣搴秵閸嬪懎鐣风仦鍙ョ箚妞ゆ劑鍨归弳娆撴煃閽樺妲告い顐ｇ箞瀹曪絽螣閼测晩妲伴梻鍌氬€搁崐鐑芥嚄閸洖绠犻柟鐐墯閸ゆ洟鏌涢锝嗙缂佺姳鍗抽弻鐔煎礈娴ｈ鐝悗瑙勬尫缁舵岸寮婚悢鍏煎€绘慨妤€妫欓悾鍓佺磽娴ｅ搫顎撶紒鎻掑⒔閹广垹鈹戠€ｎ亜鐎銈嗗姂閸ㄥ綊锝炲鍡欑瘈闂傚牊绋戦埀顒€缍婇幃褔鎮╁顔界稁缂傚倷鐒﹁摫濠殿垱娼欓埞鎴︻敊閽樺顫呴梺绋款儐閹瑰洭宕洪埀顒併亜閹烘垵顏柣鎾存礋閹鏁愭惔鈥茬凹閻庤娲栭惌鍌炲蓟閻旂⒈鏁婇柤娴嬫櫇妤旈柣搴ゎ潐濞叉牠鎮ラ崗闂寸箚闁归棿绀佸敮閻熸粌绻樻俊鍫曟煥鐎ｎ剛鐦堝┑鐐茬墕閻忔繂鈻嶅▎鎴犵＜闂婎偒鍘鹃惌娆撴煛娴ｇ鏆ｆい銏℃瀹曠厧鈹戞繝鍐╁暫?
            this.actor.rungameInfo.attack *= 1.2;
            
            this.setProjectileCount(a);
            
        }
    }

    /**
     * 闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣捣閻棗銆掑锝呬壕濡ょ姷鍋涢ˇ鐢稿极瀹ュ绀嬫い鎺嶇劍椤斿洦绻濆閿嬫緲閳ь剚娲熷畷顖烆敍濮樿鲸娈鹃梺鍝勮閸庢煡鎮￠弴鐘亾閸忓浜鹃梺閫炲苯澧寸€规洘娲熼獮瀣偐閻㈡妲搁梻浣告惈缁嬩線宕㈡禒瀣亗婵炲棙鎸婚悡鐔镐繆閵堝倸浜鹃梺缁橆殔閿曪箑鈻庨姀銈嗗殤妞ゆ帒鍊婚敍婊堟⒑闁偛鑻晶顕€鏌ｉ敐鍡欑疄鐎规洜鍠栭、妤呭磼濮橆剛顔囬梻浣筋嚙妤犲摜绮诲澶婄？閺夊牃鏅滃畷鏌ユ煙閻戞﹩娈曢柛瀣ф櫊濮婃椽顢楅埀顒傜矓閻㈠憡鍋傞柣鏂垮悑閻撱儵鏌￠崘銊モ偓鐟扳枍閺囥垺鐓熸い鎾跺枎濞搭噣鏌″畝鈧崰鏍€佸▎鎾村亗閹肩补鎳ｉ埡鍛拺閻庡湱濯崵娆撴⒑鐢喚绉柣娑卞櫍瀹曞爼顢楁径瀣珜闂備胶顭堥張顒傚垝瀹ュ闂い鏍仦閳锋垿鎮归崶銊ョ祷妞ゆ帇鍨洪妵鍕籍閳ь剟鎮ч悩鑼殾闁瑰墎鐡旈弫瀣煃瑜滈崜娆撴偩瀹勯偊鐓ラ柛顐ゅ枎娴滄粍绻濋棃娑樷偓鎼佀囬姘ｆ灁?
     */
    runGameInit(startRoleId: CareerRoleId = 'student'):RunGameInfoVo {
        if (this.actor == undefined){
            this.actor = this.node.getComponent(Actor);
        }
        this.node.setWorldPosition(Vec3.ZERO);
        this.actor.resetState(ActorState.Idle);
        this.actor.input.set(0, 0, 0);
        this.actor.angleInput.set(0, 0, -1);
        this.actor.rigidbody?.setLinearVelocity(Vec3.ZERO);
        this.actor.rigidbody?.setAngularVelocity(Vec3.ZERO);
        this.playerDoKill = 0;
        this.eliteKillCount = 0;
        this.shootTime = 0;
        this.clearEliteDrops();

        // TODO 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜忛弳锕傛煟閵忋埄鐒剧紒鎰殜閺岀喖骞嶉纰辨毉闂佺顑戠换婵嬪蓟閵娾晛绫嶉柛灞剧煯婢规洟姊洪崫鍕棡缂侇喗鎹囧濠氭晲婢跺﹥顥濋梺鍦焾鐎涒晠宕伴幇鐗堚拺缂備焦顭囩粻姘箾婢跺娲撮柛鈺冨仱楠炲鏁傞挊澶夋睏闂備礁鎲￠悷銉┧囨导鏉戠畺婵炲棙鍨圭壕钘壝归敐鍡楃祷濞存粓绠栧铏瑰寲閺囩偛鈷夊銈庡幖濞层劌顕ｈ閸┾偓妞ゆ帒瀚埛鎺楁煕鐏炵偓鐨戝褎绋撶槐鎺斺偓锝庡亜濞搭噣鏌℃担鍝バ㈡い鎾炽偢瀹曞崬鈻庨幋顓炴櫗闂傚倷鑳堕…鍫㈡崲閹烘鐓曢柛顐ｇ妇閺嬫梹绻濇繝鍌滃闁绘挻鐩幃姗€鎮欓幓鎺嗘寖濠电偞褰冮顓㈠焵椤掍緡鍟忛柛鐘虫礈閸掓帒鈻庨幇顏嗙畾濠殿喗绻傞惌鍫澪ｆ繝姘拺闁归妞掔花鑽ょ磽瀹ュ拑宸ユい?       // gameInfo.Hp = 100;
       this.actor.rungameInfo.maxHp = 100;
       this.actor.rungameInfo.attack = 30;
       this.actor.rungameInfo.cooldown = 1;
       this.actor.rungameInfo.attackInterval = 1;
       this.actor.rungameInfo.criticalHitRate = 0.05;
       this.actor.rungameInfo.criticalStrike = 0;
       this.actor.rungameInfo.hpAdd = 10;
       this.actor.rungameInfo.defense = 1;
       this.actor.rungameInfo.moveSpeed = 5.0;
       this.actor.rungameInfo.level = 1;
       this.actor.rungameInfo.exp = 0;
       this.actor.rungameInfo.maxExp = this.getExpRequirementForLevel(1);
       this.actor.rungameInfo.skillPoint = 0;
       this.actor.rungameInfo.Hp = this.actor.rungameInfo.maxHp;
       this.projectileTraceEnabled = true;
       this.projectilePenetration = 1;
       this.attackIntervalDebuffScale = 1;
       this.attackIntervalDebuffRemain = 0;
       this.careerShotCounter = 0;
       this.careerHitHealCooldown = 0;
       this.careerBranchPoints = {};
        this.setProjectileCount(1);
        this.applyCareerRole(startRoleId, true, true);
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, 1);
        this.node.emit(OnOrEmitConst.OnExpGain, this.actor.rungameInfo.exp, this.actor.rungameInfo.maxExp, this);

        return this.actor.rungameInfo;
    }

    private getExpRequirementForLevel(level: number): number{
        const lv = Math.max(1, Math.floor(level));
        const earlyCurve = [2, 3, 4, 5, 7, 9, 11, 14, 17, 21];
        if (lv <= earlyCurve.length){
            return earlyCurve[lv - 1];
        }
        if (lv <= 20){
            return Math.floor(22 + Math.pow(lv - 10, 1.38) * 0.92);
        }
        if (lv <= 40){
            return Math.floor(44 + Math.pow(lv - 20, 1.46) * 1.05);
        }
        return Math.floor(127 + Math.pow(lv - 40, 1.6) * 1.28);
    }

    changeAttack(delta: number){
        const currentAttack = Number.isFinite(this.actor.rungameInfo.attack) ? this.actor.rungameInfo.attack : 1;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.attack = Math.max(1, currentAttack + safeDelta);
    }

    changeAttackInterval(delta: number){
        const currentInterval = Number.isFinite(this.actor.rungameInfo.attackInterval) ? this.actor.rungameInfo.attackInterval : 1;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.attackInterval = math.clamp(currentInterval + safeDelta, 0.15, 5);
    }

    changeMoveSpeed(delta: number){
        const currentMoveSpeed = Number.isFinite(this.actor.rungameInfo.moveSpeed) ? this.actor.rungameInfo.moveSpeed : 5;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.moveSpeed = Math.max(1, currentMoveSpeed + safeDelta);
    }

    changeProjectileCount(delta: number){
        const nextCount = math.clamp(this.actor.rungameInfo.projectileCount + delta, 1, 9);
        this.setProjectileCount(nextCount);
    }

    changeProjectilePenetration(delta: number){
        const nextPenetration = Math.round(math.clamp(this.projectilePenetration + delta, 1, 6));
        this.projectilePenetration = nextPenetration;
    }

    setProjectileTraceEnabled(enabled: boolean){
        this.projectileTraceEnabled = !!enabled;
    }

    toggleProjectileTrace(): boolean{
        this.projectileTraceEnabled = !this.projectileTraceEnabled;
        return this.projectileTraceEnabled;
    }

    isProjectileTraceEnabled(): boolean{
        return this.projectileTraceEnabled;
    }

    getCurrentLevel(): number{
        return this.actor?.rungameInfo?.level ?? 1;
    }

    getSkillPoint(): number{
        return Math.max(0, Math.floor(this.actor?.rungameInfo?.skillPoint ?? 0));
    }

    getNextSkillPointLevel(): number{
        const currentLevel = this.getCurrentLevel();
        const step = currentLevel % 5;
        return step === 0 ? currentLevel + 5 : currentLevel + (5 - step);
    }

    getCareerRoleId(): CareerRoleId{
        return this.careerRoleId;
    }

    getCareerRoleName(): string{
        return CareerRoleConfigs[this.careerRoleId]?.name ?? '计算机专业学生';
    }
    getCareerRoleConfig(): CareerRoleConfig{
        return CareerRoleConfigs[this.careerRoleId] ?? CareerRoleConfigs.student;
    }

    getCareerStackText(): string{
        return this.getCareerRoleConfig().techStacks.join(' / ');
    }

    getCareerPassiveName(): string{
        return this.getCareerRoleConfig().passiveName;
    }

    getCareerPassiveDesc(): string{
        return this.getCareerRoleConfig().passiveDesc;
    }

    private getCareerBranchConfigs(): CareerTechBranchConfig[]{
        return CareerTechTreeConfigs[this.careerRoleId] ?? [];
    }

    private getCareerBranchFocusConfig(): CareerTechBranchConfig | null{
        let focus: CareerTechBranchConfig = null;
        let maxPoint = 0;
        for (const branch of this.getCareerBranchConfigs()){
            const points = this.getCareerBranchPoint(branch.id);
            if (points > maxPoint){
                maxPoint = points;
                focus = branch;
            }
        }
        return focus;
    }

    getCareerBranchPoint(branchId: CareerBranchId): number{
        return Math.max(0, Math.floor(this.careerBranchPoints[branchId] ?? 0));
    }

    getCareerFocusBranchId(): CareerBranchId | ''{
        return this.getCareerBranchFocusConfig()?.id ?? '';
    }

    getCareerMilestoneRank(branchId: CareerBranchId): number{
        const branch = findCareerTechBranch(this.careerRoleId, branchId);
        if (!branch){
            return 0;
        }
        let rank = 0;
        for (const milestone of branch.milestones){
            if (this.careerMilestones[milestone.id]){
                rank += 1;
            }
        }
        return rank;
    }

    hasCareerMilestone(milestoneId: string): boolean{
        return !!this.careerMilestones[milestoneId];
    }

    hasUnlockableCareerMilestone(): boolean{
        return this.getCareerMilestonePreviewList().some((item)=> item.ready);
    }

    private getCareerBranchDisplayName(branchId: string): string{
        const branch = findCareerTechBranch(this.careerRoleId, branchId);
        if (branch){
            return branch.shortName || branch.name;
        }
        return branchId;
    }

    getCareerMilestoneHudText(): string{
        if (this.careerRoleId === 'student'){
            return this.canSelectSpecialization()
                ? '可转职：前端 / 后端 / 产品 / 项目 / 测试 / 实施'
                : `Lv.${CareerSpecializationUnlockLevel} 可转职`;
        }

        const previews = this.getCareerMilestonePreviewList();
        if (previews.length <= 0){
            return '技术树已全部突破';
        }

        const readyItems = previews.filter((item)=> item.ready);
        if (readyItems.length > 0){
            const target = readyItems[0];
            const branchName = this.getCareerBranchDisplayName(target.branch.id);
            const moreText = readyItems.length > 1 ? `，另有 ${readyItems.length} 项` : '';
            return `${branchName} 可突破${moreText}`;
        }

        const nextMilestone = previews[0];
        const branchName = this.getCareerBranchDisplayName(nextMilestone.branch.id);
        if (this.getSkillPoint() > 0){
            if (nextMilestone.missingBranchLevel > 0){
                return `已持有技能点，${branchName} 还差 ${nextMilestone.missingBranchLevel} 级`;
            }
            if (nextMilestone.missingSkillPoint > 0){
                return `分支已达标，还差 ${nextMilestone.missingSkillPoint} 点技能点`;
            }
        }

        if (nextMilestone.missingBranchLevel <= 0){
            return `下个技能点 Lv.${this.getNextSkillPointLevel()}，${branchName} 待突破`;
        }
        return `下个技能点 Lv.${this.getNextSkillPointLevel()}，${branchName} 目标 Lv.${nextMilestone.requiredBranchLevel}`;
    }

    getCareerBranchStatusText(): string{
        if (this.careerRoleId === 'student'){
            return '主修：待转职';
        }
        const focus = this.getCareerBranchFocusConfig();
        if (!focus){
            return '主修：未确定';
        }
        const milestoneRank = this.getCareerMilestoneRank(focus.id);
        const suffix = milestoneRank > 0 ? ` | 突破 ${milestoneRank}` : '';
        return `主修：${this.getCareerBranchDisplayName(focus.id)} Lv.${this.getCareerBranchPoint(focus.id)}${suffix}`;
    }

    addCareerBranchProgress(branchId: CareerBranchId, amount: number = 1): number{
        const branch = findCareerTechBranch(this.careerRoleId, branchId);
        if (!branch){
            return 0;
        }
        const nextLevel = this.getCareerBranchPoint(branchId) + Math.max(1, Math.floor(amount));
        this.careerBranchPoints[branchId] = nextLevel;
        this.actor.rungameInfo.careerBranchId = branch.id;
        this.actor.rungameInfo.careerBranchName = this.getCareerBranchDisplayName(branch.id);
        return nextLevel;
    }

    getCareerBranchWeightBonus(branchId: CareerBranchId): number{
        const points = this.getCareerBranchPoint(branchId);
        if (points <= 0){
            return 0;
        }
        const focus = this.getCareerBranchFocusConfig();
        let bonus = Math.min(0.72, points * 0.18);
        if (focus?.id === branchId){
            bonus += 0.24;
        }
        return bonus;
    }

    canUnlockCareerMilestone(branchId: CareerBranchId, milestoneId: string): boolean{
        const milestone = findCareerTechMilestone(this.careerRoleId, branchId, milestoneId);
        if (!milestone){
            return false;
        }
        if (this.careerMilestones[milestone.id]){
            return false;
        }
        if (this.getSkillPoint() < milestone.costSkillPoint){
            return false;
        }
        return this.getCareerBranchPoint(branchId) >= milestone.requiredBranchLevel;
    }

    unlockCareerMilestone(branchId: CareerBranchId, milestoneId: string): boolean{
        const milestone = findCareerTechMilestone(this.careerRoleId, branchId, milestoneId);
        if (!milestone || !this.canUnlockCareerMilestone(branchId, milestoneId)){
            return false;
        }
        this.actor.rungameInfo.skillPoint = Math.max(0, this.actor.rungameInfo.skillPoint - milestone.costSkillPoint);
        this.careerMilestones[milestone.id] = 1;
        this.applyCareerPerks(milestone.perks);
        director.getScene().emit(OnOrEmitConst.OnSkillPointChanged, this.actor.rungameInfo.skillPoint, 0, this.getCurrentLevel());
        return true;
    }

    private getCareerMilestonePreviewList(): CareerMilestonePreview[]{
        if (this.careerRoleId === 'student'){
            return [];
        }

        const focusBranchId = this.getCareerBranchFocusConfig()?.id ?? '';
        const previews: CareerMilestonePreview[] = [];
        for (const branch of this.getCareerBranchConfigs()){
            const nextMilestone = branch.milestones.find((item)=> !this.careerMilestones[item.id]);
            if (!nextMilestone){
                continue;
            }

            const branchPoint = this.getCareerBranchPoint(branch.id);
            const missingBranchLevel = Math.max(0, nextMilestone.requiredBranchLevel - branchPoint);
            const missingSkillPoint = Math.max(0, nextMilestone.costSkillPoint - this.getSkillPoint());
            previews.push({
                branch,
                milestoneId: nextMilestone.id,
                milestoneTitle: nextMilestone.title,
                requiredBranchLevel: nextMilestone.requiredBranchLevel,
                costSkillPoint: nextMilestone.costSkillPoint,
                missingBranchLevel,
                missingSkillPoint,
                ready: missingBranchLevel <= 0 && missingSkillPoint <= 0,
                isFocus: focusBranchId === branch.id,
            });
        }

        previews.sort((left, right)=>{
            if (left.ready !== right.ready){
                return left.ready ? -1 : 1;
            }
            if (left.isFocus !== right.isFocus){
                return left.isFocus ? -1 : 1;
            }
            if (left.missingBranchLevel !== right.missingBranchLevel){
                return left.missingBranchLevel - right.missingBranchLevel;
            }
            if (left.missingSkillPoint !== right.missingSkillPoint){
                return left.missingSkillPoint - right.missingSkillPoint;
            }
            return left.requiredBranchLevel - right.requiredBranchLevel;
        });

        return previews;
    }

    getCareerPassiveStatusText(): string{
        switch (this.careerRoleId){
        case 'frontend':
            return this.hasCareerMilestone('frontend-component-4')
                ? '双端渲染+：每次攻击追加四向补刀'
                : '双端渲染：每次攻击追加两侧补刀';
        case 'backend':
            return this.hasCareerMilestone('backend-data-4')
                ? '链路穿透+：额外穿透，精英与 Boss 伤害更高'
                : '链路穿透：+1 穿透，精英与 Boss 伤害更高';
        case 'product':
            return this.hasCareerMilestone('product-insight-4')
                ? '需求回流+：追踪命中恢复更强'
                : '需求回流：追踪命中回复生命';
        case 'project':
            return this.hasCareerMilestone('project-risk-4')
                ? '节奏兜底+：减伤更强，维护负担更轻'
                : '节奏兜底：减伤并缩短维护负担';
        case 'qa': {
            const weakspotCycle = this.hasCareerMilestone('qa-gate-4') ? 3 : 4;
            const step = this.careerShotCounter % weakspotCycle;
            const remain = step === 0 ? weakspotCycle : (weakspotCycle - step);
            const suffix = this.hasCareerMilestone('qa-gate-4') ? '强化' : '';
            return `缺陷放大${suffix ? `(${suffix})` : ''}：再打 ${remain} 发触发弱点`;
        }
        case 'delivery':
            return this.hasCareerMilestone('delivery-support-4')
                ? '现场托底+：残血更硬，击杀回复更强'
                : '现场托底：残血减伤，击杀后恢复生命';
        default:
            return '基础打底：转职前均衡成长';
        }
    }

    getCareerUnlockLevel(): number{
        return CareerSpecializationUnlockLevel;
    }

    isSpecialized(): boolean{
        return this.careerRoleId !== 'student';
    }

    canSelectSpecialization(level?: number): boolean{
        const currentLevel = level ?? this.getCurrentLevel();
        return !this.isSpecialized() && currentLevel >= CareerSpecializationUnlockLevel;
    }

    applyCareerRole(roleId: CareerRoleId, emitEvent: boolean = true, forcePerks: boolean = false): boolean{
        const config = CareerRoleConfigs[roleId];
        if (!config){
            return false;
        }
        const changed = this.careerRoleId !== roleId;
        this.resetCareerRuntimeState();
        this.careerRoleId = roleId;
        this.actor.rungameInfo.careerRoleId = config.id;
        this.actor.rungameInfo.careerRoleName = config.name;
        if (changed || forcePerks){
            this.applyCareerPerks(config.basePerks);
        }
        if (emitEvent){
            director.getScene().emit(
                OnOrEmitConst.OnCareerChanged,
                config.id,
                config.name,
                config.techStacks.join(' / '),
                config.specialty,
            );
        }
        return changed;
    }

    getCurrentAttackInterval(): number{
        const base = this.actor?.rungameInfo?.attackInterval ?? 1;
        const safeBase = Number.isFinite(base) ? base : 1;
        const safeScale = Number.isFinite(this.attackIntervalDebuffScale) ? this.attackIntervalDebuffScale : 1;
        return math.clamp(safeBase * safeScale, 0.15, 8);
    }

    applyMaintenanceBurden(scale: number = 1.25, duration: number = 2.4, source: string = 'Code Mess'){
        let nextScale = math.clamp(scale, 1.05, 3);
        let nextDuration = duration;
        if (this.careerRoleId === 'project'){
            nextScale = math.clamp(nextScale * 0.92, 1.02, 3);
            nextDuration *= 0.65;
            if (this.hasCareerMilestone('project-risk-4')){
                nextScale = math.clamp(nextScale * 0.86, 1.01, 3);
                nextDuration *= 0.72;
            }
        } else if (this.careerRoleId === 'delivery'){
            nextScale = math.clamp(nextScale * 0.95, 1.02, 3);
            nextDuration *= 0.82;
        }
        this.attackIntervalDebuffScale = Math.max(this.attackIntervalDebuffScale, nextScale);
        this.attackIntervalDebuffRemain = Math.max(this.attackIntervalDebuffRemain, nextDuration);
        director.getScene().emit(
            OnOrEmitConst.OnEliteCast,
            "burden",
            this.node.worldPosition,
            source,
            this.attackIntervalDebuffScale,
            this.attackIntervalDebuffRemain,
        );
    }

    adjustOutgoingDamage(damage: number, monster: Monster, projectile: ProjectileManager | null = null): number{
        let result = damage * (projectile?.projectileProperty?.damageScale ?? 1);
        switch (this.careerRoleId){
        case 'backend':
            result *= monster?.isBoss || monster?.isElite ? 1.35 : 1.08;
            if (this.hasCareerMilestone('backend-data-4')){
                result *= monster?.isBoss || monster?.isElite ? 1.12 : 1.05;
            }
            break;
        case 'product':
            if (projectile?.projectileProperty?.isTrace){
                result *= 1.12;
                if (this.hasCareerMilestone('product-insight-4')){
                    result *= 1.08;
                }
            }
            break;
        case 'project':
            if (this.actor.rungameInfo.Hp / Math.max(1, this.actor.rungameInfo.maxHp) <= 0.7){
                result *= 1.10;
            }
            break;
        case 'delivery':
            if (this.actor.rungameInfo.Hp / Math.max(1, this.actor.rungameInfo.maxHp) <= 0.6){
                result *= 1.15;
            }
            break;
        default:
            break;
        }
        return result;
    }

    adjustIncomingDamage(damage: number): number{
        let scale = 1;
        switch (this.careerRoleId){
        case 'project':
            scale = this.hasCareerMilestone('project-risk-4') ? 0.76 : 0.85;
            if (this.hasCareerMilestone('project-risk-4') && this.attackIntervalDebuffRemain > 0){
                scale *= 0.88;
            }
            break;
        case 'delivery':
            if (this.actor.rungameInfo.Hp / Math.max(1, this.actor.rungameInfo.maxHp) <= 0.6){
                scale = this.hasCareerMilestone('delivery-support-4') ? 0.58 : 0.75;
            } else {
                scale = this.hasCareerMilestone('delivery-support-4') ? 0.85 : 0.92;
            }
            break;
        default:
            break;
        }
        return Math.max(1, damage * scale);
    }

    onProjectileHitMonster(monster: Monster, _damage: number, projectile: ProjectileManager | null = null){
        if (!monster){
            return;
        }
        if (this.careerRoleId === 'product' && projectile?.projectileProperty?.isTrace){
            if (this.careerHitHealCooldown <= 0){
                const healAmount = this.hasCareerMilestone('product-insight-4')
                    ? (monster.isBoss || monster.isElite ? 3 : 2)
                    : 1;
                this.heal(healAmount);
                this.careerHitHealCooldown = this.hasCareerMilestone('product-insight-4') ? 0.08 : 0.12;
            }
        }
    }

    isMaintenanceBurdenActive(): boolean{
        return this.attackIntervalDebuffRemain > 0;
    }

    getMaintenanceBurdenScale(): number{
        return this.attackIntervalDebuffScale;
    }

    getMaintenanceBurdenRemain(): number{
        return Math.max(0, this.attackIntervalDebuffRemain);
    }

    changeDefense(delta: number){
        const currentDefense = Number.isFinite(this.actor.rungameInfo.defense) ? this.actor.rungameInfo.defense : 0;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        this.actor.rungameInfo.defense = Math.max(0, currentDefense + safeDelta);
    }

    changeMaxHp(delta: number, heal: number = 0){
        const currentMaxHp = Number.isFinite(this.actor.rungameInfo.maxHp) ? this.actor.rungameInfo.maxHp : 1;
        const currentHp = Number.isFinite(this.actor.rungameInfo.Hp) ? this.actor.rungameInfo.Hp : currentMaxHp;
        const safeDelta = Number.isFinite(delta) ? delta : 0;
        const safeHeal = Number.isFinite(heal) ? heal : 0;
        this.actor.rungameInfo.maxHp = Math.max(1, currentMaxHp + safeDelta);
        this.actor.rungameInfo.Hp = Math.min(this.actor.rungameInfo.maxHp, Math.max(0, currentHp + safeHeal));
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / this.actor.rungameInfo.maxHp);
    }

    heal(healValue: number){
        const currentMaxHp = Number.isFinite(this.actor.rungameInfo.maxHp) ? this.actor.rungameInfo.maxHp : 1;
        const currentHp = Number.isFinite(this.actor.rungameInfo.Hp) ? this.actor.rungameInfo.Hp : currentMaxHp;
        const safeHeal = Number.isFinite(healValue) ? healValue : 0;
        this.actor.rungameInfo.Hp = Math.min(currentMaxHp, Math.max(0, currentHp + safeHeal));
        director.getScene().emit(OnOrEmitConst.OnPlayerhurt, this.actor.rungameInfo.Hp / currentMaxHp);
    }

    resetDebugStats(){
        this.runGameInit();
    }

    getDebugSummary(): string {
        const info = this.actor.rungameInfo;
        const interval = this.getCurrentAttackInterval();
        const debuff = this.attackIntervalDebuffRemain > 0
            ? `,负担=x${this.attackIntervalDebuffScale.toFixed(2)}(${this.attackIntervalDebuffRemain.toFixed(1)}s)`
            : "";
        const hp = Number.isFinite(info.Hp) ? info.Hp : 0;
        const maxHp = Number.isFinite(info.maxHp) ? info.maxHp : 1;
        const attack = Number.isFinite(info.attack) ? info.attack : 0;
        const moveSpeed = Number.isFinite(info.moveSpeed) ? info.moveSpeed : 0;
        return `职业=${this.getCareerRoleName()}, 被动=${this.getCareerPassiveName()}, ${this.getCareerBranchStatusText()}, 等级=${info.level}, SP=${this.getSkillPoint()}, 生命=${hp.toFixed(0)}/${maxHp.toFixed(0)}, 攻击=${attack.toFixed(0)}, 攻速=${interval.toFixed(2)}, 移速=${moveSpeed.toFixed(1)}, 子弹=${info.projectileCount}, 穿透=${this.projectilePenetration}, 追踪=${this.projectileTraceEnabled ? "开" : "关"}, 击杀=${this.playerDoKill}, 精英=${this.eliteKillCount}, 灵核=${this.eliteDrops.length}${debuff}`;
    }

    applyLevelConfig(config: LevelConfigVo | null){
        if (!config){
            return;
        }
        this.eliteDropRewardExp = Math.max(1, Math.floor(config.EliteCoreDropExp ?? this.eliteDropRewardExp));
        this.eliteDropRewardHeal = Math.max(0, Math.floor(config.EliteCoreDropHeal ?? this.eliteDropRewardHeal));
        this.eliteDropLifeTime = Math.max(3, config.EliteCoreDropLifeTime ?? this.eliteDropLifeTime);
        this.eliteDropMagnetRadius = Math.max(1.5, config.EliteCoreMagnetRadius ?? this.eliteDropMagnetRadius);
        this.eliteDropCollectRadius = Math.max(0.4, config.EliteCoreCollectRadius ?? this.eliteDropCollectRadius);

        this.eliteLootAttack = Math.max(1, config.EliteLootAttack ?? this.eliteLootAttack);
        this.eliteLootAttackInterval = config.EliteLootAttackInterval ?? this.eliteLootAttackInterval;
        this.eliteLootProjectile = Math.max(1, Math.floor(config.EliteLootProjectile ?? this.eliteLootProjectile));
        this.eliteLootPenetration = Math.max(1, Math.floor(config.EliteLootPenetration ?? this.eliteLootPenetration));
        this.eliteLootMoveSpeed = Math.max(0.1, config.EliteLootMoveSpeed ?? this.eliteLootMoveSpeed);
        this.eliteLootMaxHp = Math.max(1, config.EliteLootMaxHp ?? this.eliteLootMaxHp);
    }

    private applyEliteLootReward(): string{
        const roll = Math.random();
        if (roll < 0.20){
            this.changeAttack(this.eliteLootAttack);
            return `热路径优化（攻击 +${this.eliteLootAttack}）`;
        }
        if (roll < 0.40){
            this.changeAttackInterval(this.eliteLootAttackInterval);
            return `持续集成提速（攻速 ${this.eliteLootAttackInterval.toFixed(2)}）`;
        }
        if (roll < 0.58){
            this.changeProjectileCount(this.eliteLootProjectile);
            return `脚手架扩展（子弹 +${this.eliteLootProjectile}）`;
        }
        if (roll < 0.74){
            this.changeProjectilePenetration(this.eliteLootPenetration);
            return `接口联调（穿透 +${this.eliteLootPenetration}）`;
        }
        if (roll < 0.88){
            this.changeMoveSpeed(this.eliteLootMoveSpeed);
            return `工位冲刺（移速 +${this.eliteLootMoveSpeed.toFixed(1)}）`;
        }

        this.changeMaxHp(this.eliteLootMaxHp, this.eliteLootMaxHp);
        return `兜底扩容（生命上限 +${this.eliteLootMaxHp}，回复 ${this.eliteLootMaxHp}）`;
    }

    private addExp(expReward: number){
        const property = this.actor.rungameInfo;
        if (!Number.isFinite(property.exp) || property.exp < 0){
            property.exp = 0;
        }
        if (!Number.isFinite(property.level) || property.level < 1){
            property.level = 1;
        }
        if (!Number.isFinite(property.maxExp) || property.maxExp < 1){
            property.maxExp = this.getExpRequirementForLevel(property.level);
        }
        if (!Number.isFinite(property.maxHp) || property.maxHp <= 0){
            property.maxHp = 1;
        }
        if (!Number.isFinite(property.Hp)){
            property.Hp = property.maxHp;
        }
        if (!Number.isFinite(property.hpAdd)){
            property.hpAdd = 0;
        }
        if (!Number.isFinite(property.skillPoint) || property.skillPoint < 0){
            property.skillPoint = 0;
        }

        property.exp += Math.max(1, Math.floor(expReward));
        while (property.exp >= property.maxExp){
            property.exp -= property.maxExp;
            property.level = property.level + 1;
            property.maxExp = this.getExpRequirementForLevel(property.level);
            property.Hp = Math.min(property.maxHp, property.Hp + property.hpAdd);
            director.getScene().emit(OnOrEmitConst.OnPlayerhurt, property.Hp / property.maxHp);
            let gainedSkillPoint = 0;
            if (property.level % 5 === 0){
                property.skillPoint += 1;
                gainedSkillPoint = 1;
                director.getScene().emit(OnOrEmitConst.OnSkillPointChanged, property.skillPoint, gainedSkillPoint, property.level);
            }
            this.node.emit(OnOrEmitConst.OnplayerUpgrade, property.level, this, gainedSkillPoint, property.skillPoint);
        }
        this.node.emit(OnOrEmitConst.OnExpGain, property.exp, property.maxExp, this);
    }

    private spawnEliteCoreDrop(worldPosition: Vec3){
        const scene = director.getScene();
        if (!scene){
            return;
        }
        const dropNode = new Node("EliteCoreDrop");
        scene.addChild(dropNode);
        const spawnPos = v3(worldPosition.x, worldPosition.y + 0.8, worldPosition.z);
        dropNode.setWorldPosition(spawnPos);
        EffectManager.instance.findEffectNode(EffectConst.EffDie, spawnPos);
        this.eliteDrops.push({
            node: dropNode,
            bornTime: game.totalTime,
            rewardExp: this.eliteDropRewardExp,
            rewardHeal: this.eliteDropRewardHeal,
            baseY: spawnPos.y,
        });
    }

    private updateEliteDrops(deltaTime: number){
        if (this.eliteDrops.length <= 0){
            return;
        }
        this.node.getWorldPosition(tempDropPlayerPos);

        for (let i = this.eliteDrops.length - 1; i >= 0; i--){
            const drop = this.eliteDrops[i];
            if (!drop.node || !drop.node.isValid){
                this.eliteDrops.splice(i, 1);
                continue;
            }
            const life = game.totalTime - drop.bornTime;
            if (life > this.eliteDropLifeTime){
                drop.node.destroy();
                this.eliteDrops.splice(i, 1);
                continue;
            }

            drop.node.getWorldPosition(tempDropNodePos);

            // 濠电姷鏁告慨鐑藉极閸涘﹥鍙忛柣鎴ｆ閺嬩線鏌涘☉姗堟敾闁告瑥绻樺濠氬醇閻旂儵鍋撻挊澹濇椽顢旈崟顐㈡暏婵＄偑鍊栭幐楣冨磻閻斿吋鏅繛鍡樻尰閳锋垿姊婚崼姘珔闁伙附绮撻弻娑樜熼崗鍏肩彧闂侀€炲苯澧痪鏉跨Т閻ｆ繈骞栨担姝屾憰闂佹寧绻傞ˇ顖滅不濞戞瑣浜滈柟鍝勭Ф閸斿秹鏌涙惔銏″暗缂佽鲸鎸婚幏鍛村箵閹哄秴顥氭繝鐢靛О閸ㄥジ宕洪弽顓炵闁哄稁鍘介崑鍌炵叓閸ャ劍灏ㄩ柡鈧禒瀣厽闁归偊鍘奸悘銉╂煕閻曚礁浜版い銏℃椤㈡棃宕ㄩ鐓庝紟?
            tempDropNodePos.y = drop.baseY + Math.sin(life * 4) * 0.16;
            drop.node.setWorldPosition(tempDropNodePos);

            const distance = Vec3.distance(tempDropNodePos, tempDropPlayerPos);
            if (distance <= this.eliteDropCollectRadius){
                this.collectEliteCoreDrop(i);
                continue;
            }

            if (distance <= this.eliteDropMagnetRadius){
                Vec3.subtract(tempDropStep, tempDropPlayerPos, tempDropNodePos);
                tempDropStep.normalize();
                const step = Math.max(3.2, 9 - distance) * deltaTime;
                Vec3.scaleAndAdd(tempDropNodePos, tempDropNodePos, tempDropStep, step);
                drop.node.setWorldPosition(tempDropNodePos);
            }
        }
    }

    private collectEliteCoreDrop(index: number){
        const drop = this.eliteDrops[index];
        if (!drop){
            return;
        }
        const rewardExp = drop.rewardExp;
        const rewardHeal = drop.rewardHeal;
        const collectPos = drop.node && drop.node.isValid ? drop.node.getWorldPosition() : this.node.getWorldPosition();
        if (drop.node && drop.node.isValid){
            drop.node.destroy();
        }
        this.eliteDrops.splice(index, 1);

        this.addExp(rewardExp);
        this.heal(rewardHeal);
        director.getScene().emit(OnOrEmitConst.OnEliteCoreCollected, rewardExp, rewardHeal, collectPos);
    }

    private clearEliteDrops(){
        for (const drop of this.eliteDrops){
            if (drop.node && drop.node.isValid){
                drop.node.destroy();
            }
        }
        this.eliteDrops.length = 0;
    }

    getEliteDropNodes(): Node[]{
        return this.eliteDrops.filter((item)=> item.node && item.node.isValid).map((item)=> item.node);
    }

    playerOnDie(){
        let a = this.node.getWorldPosition();
        a.y = 1;
        this.node.worldPosition = a;
        console.log('Player defeated');

        // Broadcast death so the level flow can enter GameOver.
        director.getScene().emit(OnOrEmitConst.PlayerOnDie);
    }

    private configureProjectile(projectile: ProjectileManager, target: Node | null, useTrace: boolean, isCareerExtraShot: boolean){
        projectile.target = useTrace ? target : null;
        projectile.projectileProperty.isTrace = useTrace;
        projectile.projectileProperty.penetration = this.projectilePenetration;
        projectile.projectileProperty.lifeTime = 3.0;
        projectile.projectileProperty.damageScale = isCareerExtraShot ? 0.58 : 1;
        projectile.projectileProperty.careerProcTag = '';

        switch (this.careerRoleId){
        case 'backend':
            projectile.projectileProperty.penetration += 1;
            projectile.projectileProperty.lifeTime += 0.4;
            if (this.hasCareerMilestone('backend-data-4')){
                projectile.projectileProperty.penetration += 1;
            }
            break;
        case 'product':
            if (useTrace){
                projectile.projectileProperty.careerProcTag = 'productTrace';
            }
            break;
        case 'qa':
            if (!isCareerExtraShot){
                const weakspotCycle = this.hasCareerMilestone('qa-gate-4') ? 3 : 4;
                if (this.careerShotCounter % weakspotCycle === 0){
                    projectile.projectileProperty.damageScale = this.hasCareerMilestone('qa-gate-4') ? 2.1 : 1.75;
                    projectile.projectileProperty.penetration += this.hasCareerMilestone('qa-gate-4') ? 2 : 1;
                    projectile.projectileProperty.careerProcTag = 'qaWeakspot';
                }
            }
            break;
        case 'delivery':
            projectile.projectileProperty.lifeTime += 0.2;
            break;
        default:
            break;
        }
    }

    private trySpawnCareerExtraProjectiles(emitter: ProjectileEmitter, arrowStartPos: Vec3, target: Node | null){
        if (this.careerRoleId !== 'frontend' || !target){
            return;
        }
        const spreadAngles = this.hasCareerMilestone('frontend-component-4')
            ? [-22, -11, 11, 22]
            : [-11, 11];
        for (const angle of spreadAngles){
            const tempForward = angle < 0 ? tempCareerForwardL : tempCareerForwardR;
            MathUtil.rotateAround(tempForward, this.actor.angleInput, Vec3.UP, math.toRadian(angle));
            this.spawnCareerProjectile(emitter, arrowStartPos, tempForward);
        }
    }

    private spawnCareerProjectile(emitter: ProjectileEmitter, arrowStartPos: Vec3, forward: Vec3){
        const projectile = emitter.create();
        projectile.startTime = 0;
        projectile.host = this.node;
        projectile.node.forward = forward;
        projectile.node.worldPosition = arrowStartPos;
        this.configureProjectile(projectile, null, false, true);
        projectile.projectileProperty.careerProcTag = 'frontendEcho';
    }

    private applyCareerKillReward(isEliteKill: boolean, isBossKill: boolean){
        if (this.careerRoleId !== 'delivery'){
            return;
        }
        if (isBossKill){
            this.heal(this.hasCareerMilestone('delivery-support-4') ? 35 : 25);
            return;
        }
        if (isEliteKill){
            this.heal(this.hasCareerMilestone('delivery-support-4') ? 18 : 12);
            return;
        }
        this.heal(this.hasCareerMilestone('delivery-support-4') ? 4 : 2);
    }

    private resetCareerRuntimeState(){
        this.careerShotCounter = 0;
        this.careerHitHealCooldown = 0;
        this.careerBranchPoints = {};
        this.careerMilestones = {};
        this.actor.rungameInfo.careerBranchId = '';
        this.actor.rungameInfo.careerBranchName = '';
    }

    private applyCareerPerks(perks: CareerRolePerks){
        if (perks.attack){
            this.changeAttack(perks.attack);
        }
        if (perks.attackInterval){
            this.changeAttackInterval(perks.attackInterval);
        }
        if (perks.projectileCount){
            this.changeProjectileCount(perks.projectileCount);
        }
        if (perks.penetration){
            this.changeProjectilePenetration(perks.penetration);
        }
        if (perks.moveSpeed){
            this.changeMoveSpeed(perks.moveSpeed);
        }
        if (perks.defense){
            this.changeDefense(perks.defense);
        }
        if (perks.maxHp){
            this.changeMaxHp(perks.maxHp, perks.heal ?? 0);
        } else if (perks.heal){
            this.heal(perks.heal);
        }
        if (typeof perks.trace === 'boolean'){
            this.setProjectileTraceEnabled(perks.trace);
        }
    }
}


