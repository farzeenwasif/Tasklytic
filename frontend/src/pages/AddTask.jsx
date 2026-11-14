import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AddTaskModal from '../components/modals/AddBillModal'
import { TaskContext } from '../context/BillContext'

export default function AddTask() {
  const { addTask } = useContext(TaskContext);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Throws on API error so the modal can show the message
  const handleAddTask = async (taskData) => {
    await addTask(taskData);
    setIsModalOpen(false);
    navigate('/tasks');
  };

  return (
    <>
      <Layout title='Add New Task'>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='btn-primary px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg shadow-lg'
          >
            Add Task +
          </button>
        </div>
      </Layout>
      {isModalOpen && (
        <AddTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddTask}
        />
      )}
    </>
  )
}
