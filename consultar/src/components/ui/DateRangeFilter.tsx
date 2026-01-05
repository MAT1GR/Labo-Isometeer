// RUTA: consultar/src/components/ui/DateRangeFilter.tsx

import React, { useState } from "react";
import {
  subMonths,
  startOfQuarter,
  startOfYear,
  endOfDay,
  formatISO,
} from "date-fns";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import { Calendar } from "lucide-react";

interface DateRangeFilterProps {
  onFilterChange: (startDate: string, endDate: string) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onFilterChange,
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const setLastMonth = () => {
    const end = endOfDay(new Date());
    const start = subMonths(end, 1);
    onFilterChange(formatISO(start), formatISO(end));
  };

  const setLastQuarter = () => {
    const now = new Date();
    const quarterStart = startOfQuarter(now);
    const end = endOfDay(now);
    onFilterChange(formatISO(quarterStart), formatISO(end));
  };

  const setLastYear = () => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const end = endOfDay(now);
    onFilterChange(formatISO(yearStart), formatISO(end));
  };

  const handleCustomFilter = () => {
    if (startDate && endDate) {
      // Aseguramos que la fecha final incluya el día completo.
      const end = endOfDay(new Date(endDate));
      onFilterChange(startDate, formatISO(end));
    }
  };

  return (
    <Card>
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-shrink-0 flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold whitespace-nowrap">Filtrar por Fecha</h3>
        </div>

        <div className="flex-grow flex flex-col sm:flex-row gap-2">
          {/* Filtros rápidos */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={setLastMonth}>
              Mes
            </Button>
            <Button variant="outline" size="sm" onClick={setLastQuarter}>
              Trimestre
            </Button>
            <Button variant="outline" size="sm" onClick={setLastYear}>
              Año
            </Button>
          </div>

          {/* Divisor Visual */}
          <div className="hidden sm:block border-l border-gray-200 dark:border-gray-700 mx-3"></div>

          {/* Filtros personalizados */}
          <div className="flex-grow flex items-center gap-2">
            <div className="w-full">
              <label htmlFor="startDate" className="text-xs text-gray-500">
                Desde
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full">
              <label htmlFor="endDate" className="text-xs text-gray-500">
                Hasta
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="self-end">
              <Button
                size="sm"
                onClick={handleCustomFilter}
                disabled={!startDate || !endDate}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DateRangeFilter;
