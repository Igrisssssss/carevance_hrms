import { useNavigate } from 'react-router-dom';
import AddUserDrawer from '@/components/add-user/AddUserDrawer';

export default function AddUserPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8 pb-6">
      <AddUserDrawer
        open
        presentation="inline"
        onClose={() => navigate('/dashboard')}
      />
    </div>
  );
}
