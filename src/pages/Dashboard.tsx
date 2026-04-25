import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  Flame,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Truck,
  Coffee,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { orderBy, limit } from 'firebase/firestore';
import { useCollection } from '../hooks/useRealtimeData';
import { InventoryItem, RoastingBatch, Order, Invoice } from '../types';
import StatCard from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Badge, { statusBadgeVariant } from '../components/ui/Badge';
import { format } from 'date-fns';

const CHART_COLORS = ['#D4A843', '#7C5A14', '#4ade80', '#60a5fa'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-coffee-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value} kg
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: inventory }     = useCollection<InventoryItem>('inventory');
  const { data: orders }        = useCollection<Order>('orders', [orderBy('createdAt', 'desc'), limit(5)]);
  const { data: allOrders }     = useCollection<Order>('orders');
  const { data: batches }       = useCollection<RoastingBatch>('roasting_batches', [orderBy('createdAt', 'desc'), limit(5)]);
  const { data: invoices }      = useCollection<Invoice>('invoices');

  const rawStockKg = useMemo(
    () => inventory.filter((i) => i.category === 'raw').reduce((s, i) => s + (i.quantity ?? 0), 0),
    [inventory],
  );
  const roastedStockKg = useMemo(
    () => inventory.filter((i) => i.category === 'roasted').reduce((s, i) => s + (i.quantity ?? 0), 0),
    [inventory],
  );
  const packagingCount = useMemo(
    () => inventory.filter((i) => i.category === 'packaging').reduce((s, i) => s + (i.quantity ?? 0), 0),
    [inventory],
  );
  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.quantity <= i.lowStockThreshold),
    [inventory],
  );
  const activeOrders = useMemo(
    () => allOrders.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.status)).length,
    [allOrders],
  );
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    return allOrders
      .filter((o) => {
        const d = o.date?.toDate?.();
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, o) => s + (o.total ?? 0), 0);
  }, [allOrders]);

  const unpaidInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.balance ?? 0), 0),
    [invoices],
  );

  // Stock distribution for pie chart
  const pieData = [
    { name: 'بن أخضر',   value: rawStockKg },
    { name: 'محمص',     value: roastedStockKg },
    { name: 'تغليف',   value: packagingCount },
  ].filter((d) => d.value > 0);

  // Build trend data from real monthly order/batch activity
  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const month = d.getMonth();
      const year  = d.getFullYear();
      const rawOut = allOrders
        .filter((o) => {
          const od = o.date?.toDate?.();
          return od && od.getMonth() === month && od.getFullYear() === year;
        })
        .reduce((s, o) => s + (o.items?.reduce((a, it) => a + it.quantityKg, 0) ?? 0), 0);
      return { month: label, raw: rawStockKg, roasted: Math.round(rawOut * 0.85) };
    });
  }, [allOrders, rawStockKg]);

  return (
    <div className="space-y-6">
      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/20 border border-amber-700/30 rounded-xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            <span className="font-semibold">{lowStockItems.length} صنف/أصناف مخزونها منخفض</span>{' '}
            {lowStockItems.map((i) => i.name).join(', ')}
          </p>
          <Link to="/inventory" className="ml-auto text-amber-400 hover:text-amber-300 flex items-center gap-1 text-xs font-medium flex-shrink-0">
            عرض <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="مخزون البن الأخضر"
          value={rawStockKg.toFixed(1)}
          unit="kg"
          icon={Package}
          color="gold"
          sublabel={`${inventory.filter((i) => i.category === 'raw').length} أنواع`}
        />
        <StatCard
          label="مخزون المحمص"
          value={roastedStockKg.toFixed(1)}
          unit="kg"
          icon={Coffee}
          color="amber"
          sublabel="جاهز للبيع"
        />
        <StatCard
          label="الطلبات النشطة"
          value={activeOrders}
          icon={ShoppingCart}
          color="blue"
          sublabel="قيد التنفيذ"
        />
        <StatCard
          label="الإيراد الشهري"
          value={monthlyRevenue.toLocaleString()}
          unit="ج.م"
          icon={DollarSign}
          color="green"
          sublabel={`غير مدفوع: ${unpaidInvoices.toLocaleString()} ج.م`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>اتجاه المخزون</CardTitle>
            <span className="text-coffee-600 text-xs">آخر 7 أشهر</span>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradRaw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#D4A843" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4A843" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradRoasted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7C5A14" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C5A14" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3D2510" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#9C6A30', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9C6A30', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="raw"     name="خام"     stroke="#D4A843" fill="url(#gradRaw)"     strokeWidth={2} />
                <Area type="monotone" dataKey="roasted" name="محمص" stroke="#7C5A14" fill="url(#gradRoasted)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع المخزون</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(1)} kg`, '']}
                      contentStyle={{ background: '#251609', border: '1px solid #3D2510', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#D4A843' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 w-full mt-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                        <span className="text-coffee-400">{d.name}</span>
                      </div>
                      <span className="text-coffee-200 font-medium">{d.value.toFixed(1)} kg</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-coffee-600 text-sm">
                لا توجد بيانات مخزون
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom row: Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle>آخر الطلبات</CardTitle>
            <Link to="/orders" className="text-coffee-400 hover:text-coffee-300 text-xs flex items-center gap-1">
              عرض الكل <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {orders.length === 0 ? (
              <div className="py-10 text-center text-coffee-600 text-sm">لا توجد طلبات</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left text-coffee-500 text-xs font-medium px-5 py-2.5">الطلب</th>
                    <th className="text-left text-coffee-500 text-xs font-medium px-2 py-2.5">العميل</th>
                    <th className="text-right text-coffee-500 text-xs font-medium px-5 py-2.5">الإجمالي</th>
                    <th className="text-right text-coffee-500 text-xs font-medium px-5 py-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3 text-coffee-300 font-mono text-xs">{o.orderNumber}</td>
                      <td className="px-2 py-3 text-coffee-200">{o.clientName}</td>
                      <td className="px-5 py-3 text-right text-coffee-100 font-medium">
                        {o.currency} {o.total?.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant={statusBadgeVariant(o.status)}>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        {/* Recent roasting batches */}
        <Card>
          <CardHeader>
            <CardTitle>آخر دُفعات التحميص</CardTitle>
            <Link to="/roasting" className="text-coffee-400 hover:text-coffee-300 text-xs flex items-center gap-1">
              عرض الكل <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {batches.length === 0 ? (
              <div className="py-10 text-center text-coffee-600 text-sm">لا توجد دُفعات</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left text-coffee-500 text-xs font-medium px-5 py-2.5">الدُفعة</th>
                    <th className="text-left text-coffee-500 text-xs font-medium px-2 py-2.5">البروفايل</th>
                    <th className="text-right text-coffee-500 text-xs font-medium px-2 py-2.5">خام</th>
                    <th className="text-right text-coffee-500 text-xs font-medium px-5 py-2.5">محمص</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3 text-coffee-300 font-mono text-xs">{b.batchNumber}</td>
                      <td className="px-2 py-3">
                        <Badge variant={statusBadgeVariant('roasted')} className="capitalize">{b.roastProfile}</Badge>
                      </td>
                      <td className="px-2 py-3 text-right text-coffee-400 text-xs">{b.rawWeightKg} kg</td>
                      <td className="px-5 py-3 text-right text-coffee-100 font-medium text-xs">{b.roastedWeightKg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/supply',   icon: Truck,         label: 'شحنة جديدة',  color: 'text-blue-400'   },
          { to: '/roasting', icon: Flame,          label: 'بدء التحميص', color: 'text-amber-400' },
          { to: '/orders',   icon: ShoppingCart,   label: 'طلب جديد',    color: 'text-green-400'  },
          { to: '/invoices', icon: TrendingUp,     label: 'عرض الفواتير', color: 'text-coffee-300' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-3.5 bg-surface-card border border-surface-border rounded-xl hover:border-coffee-700/60 hover:bg-surface-hover transition-all group"
          >
            <Icon size={18} className={`${color} flex-shrink-0`} />
            <span className="text-coffee-300 text-sm font-medium group-hover:text-coffee-100 transition-colors">
              {label}
            </span>
            <ArrowRight size={14} className="ml-auto text-coffee-700 group-hover:text-coffee-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
