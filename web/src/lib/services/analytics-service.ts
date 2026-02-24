import { prisma } from '@/lib/db';
import { eachDayOfInterval, startOfDay, endOfDay, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface RevenueDataPoint {
    period: string;
    revenue: number;
    bookings: number;
    adr: number;      // Average Daily Rate
    revpar: number;   // Revenue Per Available Room
    roomNights: number;
}

export interface RevenueSummary {
    totalRevenue: number;
    totalBookings: number;
    avgAdr: number;
    avgRevpar: number;
    totalRoomNights: number;
}

export interface OccupancyDataPoint {
    date: string;
    totalRooms: number;
    bookedRooms: number;
    occupancyRate: number;
    availableRooms: number;
}

export interface OccupancySummary {
    avgOccupancy: number;
    peakOccupancy: number;
    peakDate: string;
    lowestOccupancy: number;
    lowestDate: string;
}

export interface ChannelPerformance {
    channelCode: string;
    bookings: number;
    revenue: number;
    avgRoomNights: number;
    avgBookingValue: number;
}

export interface RevenueAuditItem {
    id: string; // folioId
    pnr: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    items: {
        code: string;
        description: string;
        amount: number;
        postedAt: string;
    }[];
    total: number;
    status: string;
}

export interface RevenueAuditBreakdown {
    categories: Record<string, number>;
    items: RevenueAuditItem[];
    summary: {
        totalRevenue: number;
        folioCount: number;
        transactionCount: number;
    };
}

export interface DashboardKPIs {
    revenue: {
        value: number;
        change: number;
    };
    occupancy: {
        value: number;
        change: number;
    };
    adr: {
        value: number;
        change: number;
    };
    revpar: {
        value: number;
        change: number;
    };
    activeUpsells: number;
    pendingTasks: number;
}

type GroupBy = 'day' | 'week' | 'month';

export class AnalyticsService {
    /**
     * Get revenue analytics data
     */
    async getRevenueData(
        from: Date,
        to: Date,
        hotelId: string,
        groupBy: GroupBy = 'day',
        roomType?: string,
        channelCode?: string
    ): Promise<{ data: RevenueDataPoint[]; summary: RevenueSummary }> {
        // Fetch reservations in date range
        const reservations = await prisma.reservation.findMany({
            where: {
                propertyId: hotelId,
                checkIn: { gte: from, lte: to },
                status: 'CONFIRMED',
                ...(roomType && {
                    roomTypeId: roomType
                }),
                ...(channelCode && { channelId: channelCode })
            },
            include: {
                folio: true,
                roomType: true
            }
        });

        // Get total available rooms for RevPAR calculation
        const totalInventory = await prisma.inventory.aggregate({
            where: {
                propertyId: hotelId,
                date: { gte: from, lte: to }
            },
            _sum: {
                total: true
            }
        });

        const totalRoomsAvailable = totalInventory._sum.total || 100; // Fallback to 100

        // Group data by period
        const grouped = this.groupReservationsByPeriod(reservations, groupBy, from, to);

        // Calculate metrics for each period
        const data: RevenueDataPoint[] = grouped.map(period => {
            const revenue = period.reservations.reduce((sum: number, res: any) => {
                const folioTotal = (res.folio?.totals as any)?.total || 0;
                return sum + Number(folioTotal);
            }, 0);

            const bookings = period.reservations.length;
            const roomNights = period.reservations.reduce((sum, res) => {
                const nights = Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24));
                return sum + nights;
            }, 0);

            const adr = roomNights > 0 ? revenue / roomNights : 0;
            const revpar = totalRoomsAvailable > 0 ? revenue / totalRoomsAvailable : 0;

            return {
                period: period.period,
                revenue,
                bookings,
                adr,
                revpar,
                roomNights
            };
        });

        // Calculate summary
        const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
        const totalBookings = data.reduce((sum, d) => sum + d.bookings, 0);
        const totalRoomNights = data.reduce((sum, d) => sum + d.roomNights, 0);
        const avgAdr = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;
        const avgRevpar = totalRoomsAvailable > 0 ? totalRevenue / totalRoomsAvailable : 0;

        return {
            data,
            summary: {
                totalRevenue,
                totalBookings,
                avgAdr,
                avgRevpar,
                totalRoomNights
            }
        };
    }

    /**
     * Get occupancy analytics data
     */
    async getOccupancyData(
        from: Date,
        to: Date,
        hotelId: string,
        roomType?: string
    ): Promise<{ data: OccupancyDataPoint[]; summary: OccupancySummary }> {
        const days = eachDayOfInterval({ start: from, end: to });

        const occupancyData = await Promise.all(
            days.map(async (day) => {
                const dayStart = startOfDay(day);
                const dayEnd = endOfDay(day);

                // Get total inventory for the day
                const inventory = await prisma.inventory.findMany({
                    where: {
                        propertyId: hotelId,
                        date: dayStart,
                        ...(roomType && { roomTypeId: roomType })
                    }
                });

                const totalRooms = inventory.reduce((sum, inv) => sum + inv.total, 0);
                const bookedRooms = inventory.reduce((sum, inv) => sum + inv.booked, 0);
                const availableRooms = totalRooms - bookedRooms;
                const occupancyRate = totalRooms > 0 ? (bookedRooms / totalRooms) * 100 : 0;

                return {
                    date: format(day, 'yyyy-MM-dd'),
                    totalRooms,
                    bookedRooms,
                    occupancyRate,
                    availableRooms
                };
            })
        );

        // Calculate summary
        const avgOccupancy = occupancyData.reduce((sum, d) => sum + d.occupancyRate, 0) / occupancyData.length;
        const peakDay = occupancyData.reduce((max, d) => d.occupancyRate > max.occupancyRate ? d : max, occupancyData[0]);
        const lowestDay = occupancyData.reduce((min, d) => d.occupancyRate < min.occupancyRate ? d : min, occupancyData[0]);

        return {
            data: occupancyData,
            summary: {
                avgOccupancy,
                peakOccupancy: peakDay?.occupancyRate || 0,
                peakDate: peakDay?.date || '',
                lowestOccupancy: lowestDay?.occupancyRate || 0,
                lowestDate: lowestDay?.date || ''
            }
        };
    }

    /**
     * Get channel performance data
     */
    async getChannelPerformance(
        from: Date,
        to: Date,
        hotelId: string
    ): Promise<ChannelPerformance[]> {
        const reservations = await prisma.reservation.findMany({
            where: {
                propertyId: hotelId,
                checkIn: { gte: from, lte: to },
                status: 'CONFIRMED',
                channelId: { not: null }
            },
            include: {
                folio: true,
                channel: true
            }
        });

        // Group by channel
        const channelMap = new Map<string, any[]>();

        reservations.forEach(res => {
            const channel = res.channel?.code || 'DIRECT';
            if (!channelMap.has(channel)) {
                channelMap.set(channel, []);
            }
            channelMap.get(channel)!.push(res);
        });

        // Calculate metrics per channel
        const channelPerformance: ChannelPerformance[] = Array.from(channelMap.entries()).map(([channelCode, channelReservations]) => {
            const bookings = channelReservations.length;
            const revenue = channelReservations.reduce((sum: number, res: any) => {
                const folioTotal = (res.folio?.totals as any)?.total || 0;
                return sum + Number(folioTotal);
            }, 0);

            const totalRoomNights = channelReservations.reduce((sum: number, res: any) => {
                const nights = Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24));
                return sum + nights;
            }, 0);

            const avgRoomNights = bookings > 0 ? totalRoomNights / bookings : 0;
            const avgBookingValue = bookings > 0 ? revenue / bookings : 0;

            return {
                channelCode,
                bookings,
                revenue,
                avgRoomNights,
                avgBookingValue
            };
        });

        // Sort by revenue descending
        return channelPerformance.sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * Get high-level summary for the dashboard
     */
    async getDashboardSummary(hotelId: string): Promise<DashboardKPIs> {
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

        // 1. Revenue & ADR
        const thisMonthRevenue = await this.getRevenueData(thisMonthStart, thisMonthEnd, hotelId);
        const lastMonthRevenue = await this.getRevenueData(lastMonthStart, lastMonthEnd, hotelId);

        // 2. Occupancy
        const today = startOfDay(now);
        const yesterday = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));

        const todayOccupancy = await this.getOccupancyData(today, today, hotelId);
        const yesterdayOccupancy = await this.getOccupancyData(yesterday, yesterday, hotelId);

        // 3. Upsells
        const activeUpsells = await prisma.reservation.count({
            where: {
                propertyId: hotelId,
                status: 'CONFIRMED',
                checkIn: { gte: thisMonthStart }
            }
        });

        // 4. Pending Tasks (Simplified for now)
        const pendingTasks = await prisma.reservation.count({
            where: {
                propertyId: hotelId,
                status: 'PENDING'
            }
        });

        const revChange = lastMonthRevenue.summary.totalRevenue > 0
            ? ((thisMonthRevenue.summary.totalRevenue - lastMonthRevenue.summary.totalRevenue) / lastMonthRevenue.summary.totalRevenue) * 100
            : 0;

        const occChange = todayOccupancy.summary.avgOccupancy - yesterdayOccupancy.summary.avgOccupancy;
        const adrChange = lastMonthRevenue.summary.avgAdr > 0
            ? ((thisMonthRevenue.summary.avgAdr - lastMonthRevenue.summary.avgAdr) / lastMonthRevenue.summary.avgAdr) * 100
            : 0;
        const revparChange = lastMonthRevenue.summary.avgRevpar > 0
            ? ((thisMonthRevenue.summary.avgRevpar - lastMonthRevenue.summary.avgRevpar) / lastMonthRevenue.summary.avgRevpar) * 100
            : 0;

        return {
            revenue: {
                value: thisMonthRevenue.summary.totalRevenue,
                change: revChange
            },
            occupancy: {
                value: todayOccupancy.summary.avgOccupancy,
                change: occChange
            },
            adr: {
                value: thisMonthRevenue.summary.avgAdr,
                change: adrChange
            },
            revpar: {
                value: thisMonthRevenue.summary.avgRevpar,
                change: revparChange
            },
            activeUpsells,
            pendingTasks
        };
    }

    /**
     * Get detailed revenue audit breakdown
     */
    async getRevenueAudit(
        from: Date,
        to: Date,
        hotelId: string
    ): Promise<RevenueAuditBreakdown> {
        // Fetch reservations with folios and guests
        const reservations = await prisma.reservation.findMany({
            where: {
                propertyId: hotelId,
                checkIn: { gte: from, lte: to },
                status: { in: ['CONFIRMED', 'CHECKED_OUT'] }
            },
            include: {
                folio: true,
                guest: true
            }
        });

        const categories: Record<string, number> = {};
        const auditItems: RevenueAuditItem[] = [];
        let totalRevenue = 0;
        let transactionCount = 0;

        reservations.forEach(res => {
            if (!res.folio) return;

            const folioItems = (res.folio.items as any[]) || [];
            const items: any[] = [];

            folioItems.forEach(item => {
                const amount = Number(item.amount) || 0;
                totalRevenue += amount;
                transactionCount++;

                // Aggregate by category (logic: code prefix or code)
                const category = item.code || 'OTHER';
                categories[category] = (categories[category] || 0) + amount;

                items.push({
                    code: category,
                    description: item.description,
                    amount: amount,
                    postedAt: item.postedAt
                });
            });

            auditItems.push({
                id: res.folio.id,
                pnr: res.pnr,
                guestName: res.guest.fullName,
                checkIn: res.checkIn.toISOString(),
                checkOut: res.checkOut.toISOString(),
                items,
                total: Number((res.folio.totals as any)?.total) || 0,
                status: res.folio.status
            });
        });

        return {
            categories,
            items: auditItems,
            summary: {
                totalRevenue,
                folioCount: auditItems.length,
                transactionCount
            }
        };
    }

    /**
     * Get performance metrics grouped by Rate Plan
     */
    async getRatePlanPerformance(
        from: Date,
        to: Date,
        hotelId: string
    ): Promise<any[]> {
        const reservations = await prisma.reservation.findMany({
            where: {
                propertyId: hotelId,
                checkIn: { gte: from, lte: to },
                status: { in: ['CONFIRMED', 'CHECKED_OUT'] }
            },
            include: {
                folio: true,
                ratePlan: true
            }
        });

        const performanceMap = new Map<string, any>();

        reservations.forEach(res => {
            const planCode = res.ratePlanCode || 'BAR';
            const planName = res.ratePlan?.name || planCode;

            if (!performanceMap.has(planCode)) {
                performanceMap.set(planCode, {
                    code: planCode,
                    name: planName,
                    revenue: 0,
                    bookings: 0,
                    roomNights: 0,
                    adr: 0,
                    share: 0
                });
            }

            const stats = performanceMap.get(planCode);
            const folioTotal = Number((res.folio?.totals as any)?.total) || 0;
            const nights = Math.max(1, Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24)));

            stats.revenue += folioTotal;
            stats.bookings += 1;
            stats.roomNights += nights;
        });

        const performance = Array.from(performanceMap.values());
        const totalRevenue = performance.reduce((sum, p) => sum + p.revenue, 0);

        performance.forEach(p => {
            p.adr = p.roomNights > 0 ? p.revenue / p.roomNights : 0;
            p.share = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
        });

        return performance.sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * Group reservations by time period
     */
    private groupReservationsByPeriod(reservations: any[], groupBy: GroupBy, from: Date, to: Date) {
        const periods: { period: string; reservations: any[] }[] = [];

        if (groupBy === 'day') {
            const days = eachDayOfInterval({ start: from, end: to });
            days.forEach(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayReservations = reservations.filter(res => {
                    const checkIn = startOfDay(new Date(res.checkIn));
                    return checkIn.getTime() === startOfDay(day).getTime();
                });
                periods.push({ period: dayStr, reservations: dayReservations });
            });
        } else if (groupBy === 'week') {
            let current = startOfWeek(from);
            const end = endOfWeek(to);

            while (current <= end) {
                const weekEnd = endOfWeek(current);
                const weekStr = `${format(current, 'yyyy-MM-dd')} - ${format(weekEnd, 'yyyy-MM-dd')}`;
                const weekReservations = reservations.filter(res => {
                    const checkIn = new Date(res.checkIn);
                    return checkIn >= current && checkIn <= weekEnd;
                });
                periods.push({ period: weekStr, reservations: weekReservations });
                current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
            }
        } else if (groupBy === 'month') {
            let current = startOfMonth(from);
            const end = endOfMonth(to);

            while (current <= end) {
                const monthEnd = endOfMonth(current);
                const monthStr = format(current, 'yyyy-MM');
                const monthReservations = reservations.filter(res => {
                    const checkIn = new Date(res.checkIn);
                    return checkIn >= current && checkIn <= monthEnd;
                });
                periods.push({ period: monthStr, reservations: monthReservations });
                current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
            }
        }

        return periods;
    }
}
