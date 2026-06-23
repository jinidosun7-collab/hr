-- ORO HR 이식용 기본 데이터 (schema.sql 실행 후 실행)

INSERT INTO public.leave_types (code,label,deduct_days,is_deductible) VALUES
 ('annual_7h','연차(7시간)',1,true),
 ('event','경조휴가',1,false),
 ('sick','병가',1,false),
 ('reserve','예비군 훈련',1,false),
 ('h6','6시간',0.857143,true),
 ('h5','5시간',0.714286,true),
 ('h4','4시간',0.571429,true),
 ('h3','3시간',0.428571,true),
 ('h2','2시간',0.285714,true),
 ('h1','1시간',0.142857,true);

INSERT INTO public.menu_groups (name,sort_order) VALUES
 ('개인',0),('현황',1),('인사',2),('연차',3),('설정',4),('근태',5);

INSERT INTO public.menu_tabs (tab_key,label,sort_order,group_id)
SELECT v.tab_key, v.label, v.sort_order, g.id
FROM (VALUES
 ('myleave','내 연차',1,'개인'),
 ('leave_request','휴가 입력(결재)',2,'개인'),
 ('dashboard','대시보드',1,'현황'),
 ('calendar','캘린더',2,'현황'),
 ('alerts','알림센터',3,'현황'),
 ('employees','사원 관리',1,'인사'),
 ('profile','인사카드',2,'인사'),
 ('certificate','증명서',3,'인사'),
 ('org','조직도',4,'인사'),
 ('training','교육·자격',5,'인사'),
 ('records','휴가 입력',1,'연차'),
 ('adjust','조정·수당',2,'연차'),
 ('status','연차 현황',3,'연차'),
 ('settlement','정산서',4,'연차'),
 ('approvals','결재함',9,'연차'),
 ('settings','설정',1,'설정'),
 ('permissions','권한',2,'설정'),
 ('attendance','근태 현황',1,'근태')
) AS v(tab_key,label,sort_order,gname)
JOIN public.menu_groups g ON g.name = v.gname;

INSERT INTO public.role_permissions (role,perm_key,allowed) VALUES
 ('employee','tab:myleave',true),
 ('employee','tab:leave_request',true),
 ('manager','tab:dashboard',true),('manager','tab:calendar',true),
 ('manager','tab:alerts',true),('manager','tab:status',true),
 ('manager','tab:org',true),('manager','tab:training',true),
 ('manager','tab:settlement',true),('manager','tab:approvals',true),
 ('manager','tab:attendance',true),
 ('admin','tab:dashboard',true),('admin','tab:calendar',true),
 ('admin','tab:alerts',true),('admin','tab:status',true),
 ('admin','tab:org',true),('admin','tab:training',true),
 ('admin','tab:settlement',true),('admin','tab:approvals',true),
 ('admin','tab:attendance',true),('admin','tab:employees',true),
 ('admin','tab:profile',true),('admin','tab:certificate',true),
 ('admin','tab:records',true),('admin','tab:adjust',true),
 ('admin','tab:settings',true);

-- 대표 관리자 — 새 회사 이메일로 변경하세요!
INSERT INTO public.app_admins (email,role) VALUES ('owner@newco.com','master');
