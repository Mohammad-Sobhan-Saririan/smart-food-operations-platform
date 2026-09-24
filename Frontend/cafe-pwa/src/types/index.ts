export interface User {
    id: string;
    name: string;
    email: string;
    employeeNumber: string; // The required property
    role: 'admin' | 'barista' | 'user' | 'HR';
    city?: string;
    country?: string;
    phone?: string; // Optional for forms
    age?: number; // Optional for forms
    position?: string;
    creditLimit: number;
    creditBalance: number;
    password?: string; // Optional for forms
    defaultFloorId?: number; // Optional, used for user preferences
    entitlementGroupId?: number | null;
    rst_roleId?: number | null;
    rst_permissionIds?: number[]; // Array of permission IDs for restaurant roles
    isAdUser: boolean;
    adAttributes?: Record<string, any>;
}

export interface Product {
    id?: string; name: string; price: number; category: string; description?: string; stock: number; isDisabled: boolean, imageUrl?: string;
}

export interface Order {
    id: string;
    items: string;
    status: 'Pending' | 'Completed' | 'Cancelled';
    createdAt: string;
    userName: string | null;
    deliveryFloorName: number | null;
    description: string;
    totalAmount: number;

}

export type ReportDataRow = Record<string, string | number | null>;

// Represents the configuration for a Recharts graph
export interface ChartConfig {
    chartType: 'bar' | 'line' | 'pie';
    xAxisKey: string;
    dataKeys: string[];
    colors: string[];
    // THIS WAS THE MISSING PIECE: The data the chart will display
    data?: ReportDataRow[];
}

// Represents a saved report object from the database
export interface SavedReport {
    id: string;
    name: string;
    nl_query: string;
    sql_query: string;
    chart_config: string;
    conversation_history: string;
    createdAt: string;
}

export interface Floor { id: number; name: string; }

export const statusTranslations: { [key in Order['status']]: string } = {
    Pending: "در انتظار", Completed: "تکمیل شده", Cancelled: "لغو شده"
};
export interface ProductCardProps {
    product: Product;
}

export interface RstDish {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
}

export interface RstMealType {
    id: number;
    name: string;
    DisplayName: string;
}

export interface RstReservation {
    id: number;
    userId: string;
    date: string;
    mealTypeId: number;
    statusId: number;
    chosenDishIds: string; // JSON string
}
export interface RstDailyOption {
    id: number;
    menuId: number;
    dayOfWeek: number;
    mealTypeId: number;
    dishId: number;
    isActive: boolean;
    // This data will be JOINed in the backend
    dishName?: string;
    dishImageUrl?: string;
}
