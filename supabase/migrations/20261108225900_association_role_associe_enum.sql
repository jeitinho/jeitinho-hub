-- Doit être appliquée seule (ALTER TYPE ... ADD VALUE ne peut pas être utilisé dans la même transaction).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'associe';
